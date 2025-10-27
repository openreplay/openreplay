{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = with pkgs; [
    # System libraries
    libxml2
    libxslt
    xmlsec
    openssl
    pkg-config
    
    # Python
    python313
    python313Packages.pip
    python313Packages.virtualenv
  ];

  shellHook = ''
    export LD_LIBRARY_PATH="${pkgs.lib.makeLibraryPath [ pkgs.libxml2 pkgs.libxslt pkgs.xmlsec pkgs.openssl ]}:$LD_LIBRARY_PATH"
    export PKG_CONFIG_PATH="${pkgs.lib.makeSearchPathOutput "dev" "lib/pkgconfig" [ pkgs.libxml2 pkgs.libxslt pkgs.xmlsec pkgs.openssl ]}:$PKG_CONFIG_PATH"
    
    echo "Nix environment loaded with:"
    echo "  libxml2: ${pkgs.libxml2.version}"
    echo "  xmlsec: ${pkgs.xmlsec.version}"
    echo "  lxml and xmlsec Python packages should be built against these versions"
  '';
}
