"""Prepare release glue for bundling without changing its embedded WASM binary."""
import pathlib
import re
import subprocess
import sys

source = pathlib.Path(sys.argv[1]).read_text()
match = re.search(r"data:application/octet-stream;base64,([^\"']+)", source)
if match is None:
    raise ValueError('Missing embedded WASM binary')
# The binary is embedded; ESM has no __dirname and needs no file lookup.
source = source.replace('__dirname', '(typeof __dirname !== \"undefined\" ? __dirname : \"\")')
# Supply Node modules through factory options so the glue also works in ESM.
for name in ('fs', 'path'):
    option = 'nodeFS' if name == 'fs' else 'nodePath'
    source = re.sub(r"require\(['\"]" + name + r"['\"]\)", 'Module["' + option + '"]', source)
# Preserve names such as __asyncjs__cardano_* used by named WASM imports.
source = re.sub(r'(?<![A-Za-z0-9_])_cardano_', '', source)
result = subprocess.run(
    ['node', '-e', "const fs=require('fs'),esbuild=require('esbuild');process.stdout.write(esbuild.transformSync(fs.readFileSync(0,'utf8'),{minifyWhitespace:true,minifySyntax:false,minifyIdentifiers:false}).code)"],
    input=source, text=True, capture_output=True, check=True,
    cwd=pathlib.Path(__file__).resolve().parent.parent,
)
pathlib.Path(sys.argv[2]).write_text(result.stdout)
