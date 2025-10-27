{ pkgs ? import <nixpkgs> {} }:

let
  # Create a Python environment with Nix-provided packages
  pythonEnv = pkgs.python313.withPackages (ps: with ps; [
    # Critical packages from Nix to ensure version compatibility
    lxml        # python3.13-lxml (currently 6.0.1 in nixpkgs)
    xmlsec      # python3.13-xmlsec (currently 1.3.16 in nixpkgs)
    
    # Other common packages available in nixpkgs
    urllib3
    requests
    boto3
    pyjwt
    psycopg2
    clickhouse-connect
    cachetools
    fastapi
    uvicorn
    gunicorn
    python-decouple
    pydantic
    apscheduler
    python-multipart
    redis
    
    # Tools
    pip
    virtualenv
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
