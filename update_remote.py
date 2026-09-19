import pexpect
import sys

host = "192.168.1.199"
user = "tuna"
password = "1234@Somun"

print(f"Connecting to {user}@{host}...")
child = pexpect.spawn(f"ssh {user}@{host} 'cd /opt/yapayzekacalisan && sudo -S ./scripts/update.sh'", encoding='utf-8')
child.logfile = sys.stdout

idx = child.expect(['assword:', pexpect.EOF, pexpect.TIMEOUT], timeout=60)
if idx == 0:
    child.sendline(password)
    # The script might ask for sudo password
    idx2 = child.expect(['assword', pexpect.EOF, pexpect.TIMEOUT], timeout=120)
    if idx2 == 0:
        child.sendline(password)
        child.expect(pexpect.EOF, timeout=300)
    elif idx2 == 1:
        print("EOF")
    else:
        print("TIMEOUT")
elif idx == 1:
    print("EOF")
else:
    print("TIMEOUT")
