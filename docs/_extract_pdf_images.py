from pathlib import Path
import pypdf

r = pypdf.PdfReader(Path(__file__).with_name("Paddy Inward (feedback 33).pdf"))
out = Path(__file__).with_name("_f33_images")
out.mkdir(exist_ok=True)
n = 0
for pi, page in enumerate(r.pages):
    resources = page.get("/Resources")
    if not resources:
        continue
    resources = resources.get_object()
    xobjects = resources.get("/XObject")
    if not xobjects:
        continue
    xobjects = xobjects.get_object()
    for key in xobjects:
        obj = xobjects[key].get_object()
        if obj.get("/Subtype") != "/Image":
            continue
        n += 1
        w, h = obj.get("/Width"), obj.get("/Height")
        filt = obj.get("/Filter")
        print(f"page{pi+1} {key} {w}x{h} filter={filt}")
        data = obj.get_data()
        ext = "bin"
        if filt == "/DCTDecode" or (isinstance(filt, list) and "/DCTDecode" in filt):
            ext = "jpg"
        elif filt == "/JPXDecode":
            ext = "jp2"
        (out / f"p{pi+1}_{str(key).lstrip('/')}.{ext}").write_bytes(data)
print("saved", n, "to", out)
