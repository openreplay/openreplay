# In order to solve vulnerability issue CVE-2026-41066
# Pinned nixpkgs (nixos-unstable, 2026-10-23) so lxml/xmlsec versions don't
# depend on whichever channel the nixos/nix builder image ships with.
# To bump: pick a newer commit from https://github.com/NixOS/nixpkgs/commits/nixos-unstable,
# put its hash in the `url`, and set `sha256` to the hash Nix reports on the first (failing) build.
{ pkgs ? import (fetchTarball {
    url = "https://github.com/NixOS/nixpkgs/archive/02c087f3fe673c9e317f206a627cb6b910336dbe.tar.gz";
    sha256 = "sha256-IoNisKcGbUjdd45qCqywGMCYmZ5EnkxezvLII0FWwNA=";
  }) {} }:

let
  # Create a Python environment with Nix-provided packages
  # Only system-level packages that need C library compatibility
  pythonEnv = pkgs.python313.withPackages (ps: with ps; [
    # System packages requiring C library compatibility
    lxml        # python3.13-lxml (6.1.3 at the pinned nixpkgs revision)
    xmlsec      # python3.13-xmlsec (1.3.17 at the pinned nixpkgs revision)
    
    # Tools
    pip
  ]);
in
pkgs.mkShell {
  buildInputs = with pkgs; [
    # Python with pre-installed packages
    pythonEnv
    
    # System libraries (these are already linked via pythonEnv but included for reference)
    libxml2
    libxslt
    xmlsec
    openssl
    zlib
  ];

  shellHook = ''
    # Library paths for runtime linking
    export LD_LIBRARY_PATH="${pkgs.lib.makeLibraryPath [ 
      pkgs.libxml2 
      pkgs.libxslt 
      pkgs.xmlsec 
      pkgs.openssl 
      pkgs.zlib 
    ]}:$LD_LIBRARY_PATH"
    
    echo "Nix environment loaded with:"
    echo "  Python: ${pythonEnv.python.version}"
    echo "  libxml2: ${pkgs.libxml2.version}"
    echo "  libxslt: ${pkgs.libxslt.version}"
    echo "  xmlsec (system): ${pkgs.xmlsec.version}"
    echo "  lxml: pre-installed from nixpkgs (compatible with system libraries)"
    echo "  xmlsec (python): pre-installed from nixpkgs (compatible with system libraries)"
  '';
}
