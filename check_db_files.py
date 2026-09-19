import pexpect
import sys

host = "192.168.1.199"
user = "tuna"
password = "1234@Somun"

print(f"Connecting to {user}@{host} to check files in DB...")
cmd = "cd /opt/yapayzekacalisan && docker compose exec -T postgres psql -U postgres -d yapayzekacalisan -c 'SELECT id, filename, size, status, organization_id, created_at FROM agent_files; SELECT id, title, total_chunks FROM knowledge_documents; SELECT count(*) FROM knowledge_chunks;'"
child = pexpect.spawn(f"ssh {user}@{host} \"{cmd}\"", encoding='utf-8')
child.logfile = sys.stdout

idx = child.expect(['assword:', pexpect.EOF, pexpect.TIMEOUT], timeout=60)
if idx == 0:
    child.sendline(password)
    child.expect(pexpect.EOF, timeout=120)
elif idx == 1:
    print("EOF")
else:
    print("TIMEOUT")
