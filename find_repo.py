import pexpect
import sys

host = "192.168.1.199"
user = "tuna"
password = "1234@Somun"

print(f"Connecting to {user}@{host}...")
child = pexpect.spawn(f"ssh {user}@{host} 'ls -la; find . -maxdepth 2 -type d -name \"*yapayzekacalisan*\"'", encoding='utf-8')
child.logfile = sys.stdout

idx = child.expect(['assword:', pexpect.EOF, pexpect.TIMEOUT], timeout=60)
if idx == 0:
    child.sendline(password)
    child.expect(pexpect.EOF, timeout=120)
elif idx == 1:
    print("EOF")
else:
    print("TIMEOUT")
