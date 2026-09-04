import http.server, os, socketserver
ROOT="/tmp/exrender-pillround"
OUT="/Users/kamal/Desktop/devpost/projects/webmcp/pill-round/video/diagrams"
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self,*a,**k): super().__init__(*a,directory=ROOT,**k)
    def do_POST(self):
        name=os.path.basename(self.path)
        n=int(self.headers.get("Content-Length","0"))
        data=self.rfile.read(n)
        os.makedirs(OUT,exist_ok=True)
        open(os.path.join(OUT,name),"wb").write(data)
        self.send_response(200); self.send_header("Content-Length","2"); self.end_headers()
        self.wfile.write(b"ok")
    def log_message(self,*a): pass
socketserver.TCPServer.allow_reuse_address=True
socketserver.TCPServer(("127.0.0.1",8098),H).serve_forever()
