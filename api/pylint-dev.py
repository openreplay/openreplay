#!/usr/bin/env python3

import argparse

from pylint import run_pylint

parser = argparse.ArgumentParser(formatter_class=argparse.RawTextHelpFormatter,
                                 # description="Scan files using PyLint\nOutput description:\n[I]nformational messages that Pylint emits (do not contribute to your analysis score)\n[R]efactor for a \"good practice\" metric violation\n[C]onvention for coding standard violation\n[W]arning for stylistic problems, or minor programming issues\n[E]rror for important programming issues (i.e. most probably bug)\n[F]atal for errors which prevented further processing"
                                 description="""\
    Scan files using PyLint
    Output description:
        >[I]nformational messages that Pylint emits (do not contribute to your analysis score)
        >[R]efactor for a \"good practice\" metric violation
        >[C]onvention for coding standard violation
        >[W]arning for stylistic problems, or minor programming issues
        >[E]rror for important programming issues (i.e. most probably bug)
        >[F]atal for errors which prevented further processing""")

parser.add_argument("-p", "--path", help="target folder or file to scan")
parser.add_argument("-a", "--all", help="scan all python files", action="store_true")
args = parser.parse_args()
target = None
if args.path:
    print(f"Scanning: {args.path}")
    target = args.path
elif args.all:
    print("Scanning all files")
    target = "./**/*.py"
else:
    print("please provide -a|-p parameters, -h for more.")
    exit(0)

run_pylint(["--ignore-paths=./.venv",
            "--load-plugins=pylint_pydantic",
            "--output-format=colorized",
            "--reports=true",
            target])
