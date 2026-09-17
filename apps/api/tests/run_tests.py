import asyncio
import sys
import os
import tempfile
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.core.database import Base

# Setup python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

async def run_all_tests():
    print("=" * 60)
    print("🚀 RUNNING P0 PRODUCTION VERIFICATION SUITE")
    print("=" * 60)

    # 1. Setup in-memory test database
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async_session = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Import test functions
    from tests.test_p0_real_features import (
        test_tenant_isolation_strict_access,
        test_sandbox_path_traversal_prevention,
        test_real_tool_calling_execution,
        test_multi_format_parsers,
        test_embedding_cosine_similarity,
        test_agent_runtime_execution_and_cancellation
    )

    passed = 0
    failed = 0

    # Test 1: Sandbox path traversal
    with tempfile.TemporaryDirectory() as tmp_dir:
        import pathlib
        try:
            test_sandbox_path_traversal_prevention(pathlib.Path(tmp_dir))
            print("✅ PASS: test_sandbox_path_traversal_prevention")
            passed += 1
        except Exception as e:
            print(f"❌ FAIL: test_sandbox_path_traversal_prevention -> {e}")
            failed += 1

    # Test 2: Multi format parsers
    try:
        test_multi_format_parsers()
        print("✅ PASS: test_multi_format_parsers")
        passed += 1
    except Exception as e:
        print(f"❌ FAIL: test_multi_format_parsers -> {e}")
        failed += 1

    # Test 3: Embedding cosine similarity
    try:
        await test_embedding_cosine_similarity()
        print("✅ PASS: test_embedding_cosine_similarity")
        passed += 1
    except Exception as e:
        print(f"❌ FAIL: test_embedding_cosine_similarity -> {e}")
        failed += 1

    # Test 4: Real tool calling & authorization
    with tempfile.TemporaryDirectory() as tmp_dir:
        import pathlib
        try:
            await test_real_tool_calling_execution(pathlib.Path(tmp_dir))
            print("✅ PASS: test_real_tool_calling_execution")
            passed += 1
        except Exception as e:
            print(f"❌ FAIL: test_real_tool_calling_execution -> {e}")
            failed += 1

    # Test 5: Agent runtime execution & cancellation
    with tempfile.TemporaryDirectory() as tmp_dir:
        import pathlib
        try:
            await test_agent_runtime_execution_and_cancellation(pathlib.Path(tmp_dir))
            print("✅ PASS: test_agent_runtime_execution_and_cancellation")
            passed += 1
        except Exception as e:
            print(f"❌ FAIL: test_agent_runtime_execution_and_cancellation -> {e}")
            failed += 1

    # Test 6: Tenant isolation in database
    async with async_session() as session:
        try:
            await test_tenant_isolation_strict_access(session)
            print("✅ PASS: test_tenant_isolation_strict_access")
            passed += 1
        except Exception as e:
            print(f"❌ FAIL: test_tenant_isolation_strict_access -> {e}")
            failed += 1

    await engine.dispose()

    print("=" * 60)
    print(f"RESULTS: {passed} PASSED, {failed} FAILED")
    print("=" * 60)
    if failed > 0:
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(run_all_tests())
