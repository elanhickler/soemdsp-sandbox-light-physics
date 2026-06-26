$ErrorActionPreference = "Stop"

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$clang = "C:\Program Files\LLVM\bin\clang++.exe"

if (!(Test-Path -LiteralPath $clang)) {
  throw "clang++ not found at $clang"
}

& $clang `
  --target=wasm32 `
  -O3 `
  -nostdlib `
  -fno-exceptions `
  -fno-rtti `
  "-Wl,--no-entry" `
  "-Wl,--export=soemdsp_ellipsoid_sample" `
  "-Wl,--export=soemdsp_ellipsoid_vector_sample" `
  "-Wl,--export=soemdsp_ellipsoid_mono" `
  "-Wl,--export=soemdsp_ellipsoid_x" `
  "-Wl,--export=soemdsp_ellipsoid_y" `
  "-Wl,--export=soemdsp_ellipsoid_version" `
  "-Wl,--export-memory" `
  -o "$root\native_modules\ellipsoid\ellipsoid.wasm" `
  "$root\native_modules\ellipsoid\ellipsoid.cpp"
