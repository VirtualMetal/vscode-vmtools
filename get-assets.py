assets = [
    "https://github.com/VirtualMetal/vmtools/releases/download/r230106/vmtools-gdb-12.1-r230106.tar.xz",
]
assetdir = "dist/assets"

import os, shutil, tarfile, tempfile, urllib.request

def get_asset(asset):
    with urllib.request.urlopen(asset) as response:
        with tempfile.TemporaryFile() as temp:
            shutil.copyfileobj(response, temp)
            temp.seek(0)
            with tarfile.open(fileobj=temp) as tar:
                tar.extractall()

if os.path.exists(assetdir):
    shutil.rmtree(assetdir)
os.makedirs(assetdir)
os.chdir(assetdir)

for asset in assets:
    print("asset: " + os.path.basename(asset))
    get_asset(asset)
