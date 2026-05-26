from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MANIFEST = (
    ROOT.parent / "soemdsp" / "runtime_dsp_object_bound_wav_resync_demo.manifest.json"
)


@dataclass
class Response:
    status: int
    reason: str
    headers: dict[str, str]
    body: bytes


def request(url: str, method: str = "GET") -> Response:
    request = urllib.request.Request(url, method=method)
    try:
        with urllib.request.urlopen(request, timeout=5) as response:
            return Response(
                status=response.status,
                reason=response.reason,
                headers={key.lower(): value for key, value in response.headers.items()},
                body=response.read(),
            )
    except urllib.error.HTTPError as error:
        return Response(
            status=error.code,
            reason=error.reason,
            headers={key.lower(): value for key, value in error.headers.items()},
            body=error.read(),
        )


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def require_no_store(response: Response, label: str) -> None:
    require(
        "no-store" in response.headers.get("cache-control", ""),
        f"{label} missing no-store cache-control",
    )
    require(
        response.headers.get("pragma") == "no-cache",
        f"{label} missing no-cache pragma",
    )
    require(response.headers.get("expires") == "0", f"{label} missing expires 0")


def wait_for_server(base_url: str) -> None:
    deadline = time.monotonic() + 5
    last_status = ""
    while time.monotonic() < deadline:
        response = request(f"{base_url}/public/index.html", method="HEAD")
        last_status = f"{response.status} {response.reason}"
        if response.status == 200:
            require_no_store(response, "public index")
            return
        time.sleep(0.1)
    raise RuntimeError(f"sandbox server did not become ready: {last_status}")


def run_smoke(port: int, manifest: Path) -> None:
    base_url = f"http://127.0.0.1:{port}"
    process = subprocess.Popen(
        [
            sys.executable,
            str(ROOT / "server.py"),
            "--port",
            str(port),
            "--manifest",
            str(manifest),
        ],
        cwd=ROOT,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    try:
        wait_for_server(base_url)

        manifest_response = request(f"{base_url}/api/manifest")
        require(manifest_response.status == 200, "manifest endpoint did not return 200")
        require_no_store(manifest_response, "manifest endpoint")
        payload = json.loads(manifest_response.body.decode("utf-8"))
        require(payload.get("ok") is True, "manifest payload was not ok")
        require(payload.get("manifestPath"), "manifest path missing")
        require(payload.get("artifactRoot"), "artifact root missing")

        handoff = payload["manifest"].get("sandboxHandoff", {})
        audio_path = handoff.get("primaryAudioArtifact")
        require(audio_path, "primary audio artifact missing from handoff")
        audio_response = request(
            f"{base_url}/artifact?path={urllib.parse.quote(audio_path)}",
            method="HEAD",
        )
        require(audio_response.status == 200, "primary audio artifact did not return 200")
        require_no_store(audio_response, "primary audio artifact")

        missing_path = request(f"{base_url}/artifact", method="HEAD")
        require(missing_path.status == 400, "missing artifact path did not return 400")
        require_no_store(missing_path, "missing artifact path")

        missing_artifact = request(
            f"{base_url}/artifact?path=missing.wav",
            method="HEAD",
        )
        require(missing_artifact.status == 404, "missing artifact did not return 404")
        require_no_store(missing_artifact, "missing artifact")

        manifest_head = request(f"{base_url}/api/manifest", method="HEAD")
        require(manifest_head.status == 405, "manifest HEAD did not return 405")
        require_no_store(manifest_head, "manifest HEAD")
    finally:
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait(timeout=5)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", default=18765, type=int)
    parser.add_argument("--manifest", default=str(DEFAULT_MANIFEST))
    args = parser.parse_args()

    run_smoke(args.port, Path(args.manifest).resolve())
    print("soemdsp-sandbox smoke test passed")


if __name__ == "__main__":
    main()
