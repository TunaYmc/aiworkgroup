import pexpect
import sys

host = "192.168.1.199"
user = "tuna"
password = "1234@Somun"

print(f"Connecting to {user}@{host} to inspect logs and restart containers...")
cmd = "cd /opt/yapayzekacalisan && sudo -S docker compose logs --tail=40 api && sudo -S ./scripts/update.sh --force"
child = pexpect.spawn(f"ssh {user}@{host} \"{cmd}\"", encoding='utf-8')
child.logfile = sys.stdout

idx = child.expect(['assword:', pexpect.EOF, pexpect.TIMEOUT], timeout=60)
if idx == 0:
    child.sendline(password)
    # Handle possible sudo prompts
    while True:
        sub_idx = child.expect(['assword', pexpect.EOF, pexpect.TIMEOUT], timeout=180)
        if sub_idx == 0:
            child.sendline(password)
        elif sub_idx == 1:
            print("\n[Done] Command execution finished.")
            break
        else:
            print("\n[Timeout] Waiting for script completion...")
            break
