"""Strip WASM debug information and normalize public C export names."""
import base64
import pathlib
import re
import subprocess
import sys
import tempfile

source = pathlib.Path(sys.argv[1]).read_text()
match = re.search(r"data:application/octet-stream;base64,([^\"']+)", source)
if match is None:
    raise ValueError('Missing embedded WASM binary')
with tempfile.TemporaryDirectory() as directory:
    binary = pathlib.Path(directory) / 'module.wasm'
    stripped = pathlib.Path(directory) / 'stripped.wasm'
    binary.write_bytes(base64.b64decode(match[1]))
    subprocess.run(['wasm-opt', str(binary), '--strip-debug', '-o', str(stripped)], check=True)
    payload = base64.b64encode(stripped.read_bytes()).decode()
source = source[:match.start(1)] + payload + source[match.end(1):]
# The binary is embedded; ESM has no __dirname and needs no file lookup.
source = source.replace('__dirname', '(typeof __dirname !== \"undefined\" ? __dirname : \"\")')
# Preserve names such as __asyncjs__cardano_* used by named WASM imports.
source = re.sub(r'(?<![A-Za-z0-9_])_cardano_', '', source)
result = subprocess.run(
    ['node', '-e', "const fs=require('fs'),esbuild=require('esbuild');process.stdout.write(esbuild.transformSync(fs.readFileSync(0,'utf8'),{minifyWhitespace:true,minifySyntax:false,minifyIdentifiers:false}).code)"],
    input=source, text=True, capture_output=True, check=True,
    cwd=pathlib.Path(__file__).resolve().parent.parent,
)
pathlib.Path(sys.argv[2]).write_text(result.stdout)
