import os
import sys
import shutil

# Add agent folder to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'agent')))
from analyze import compile_and_run, detect_language, run_static_analysis

def run_tests():
    print("=========================================")
    print(" Running Sandbox Verification Tests ")
    print("=========================================")
    
    sandbox_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "sandbox_temp"))
    
    # Test 1: Python execution
    print("\n[Test 1] Testing Python Sandbox...")
    py_code = 'print("Hello, Python sandbox!")'
    res = compile_and_run(py_code, 'python', '', sandbox_dir)
    print("Results:", res)
    assert res['compiled'] is True
    assert "Hello, Python sandbox!" in res['execution_output']
    assert res['exit_code'] == 0
    print("--> Python Sandbox: PASSED")

    # Test 2: JavaScript execution
    print("\n[Test 2] Testing JavaScript Sandbox...")
    js_code = 'console.log("Hello, JS sandbox!");'
    res = compile_and_run(js_code, 'javascript', '', sandbox_dir)
    print("Results:", res)
    assert res['compiled'] is True
    assert "Hello, JS sandbox!" in res['execution_output']
    assert res['exit_code'] == 0
    print("--> JavaScript Sandbox: PASSED")

    # Test 3: C++ compilation & execution
    print("\n[Test 3] Testing C++ Compiler & Sandbox...")
    cpp_code = """
#include <iostream>
int main() {
    std::cout << "Hello, C++ sandbox!" << std::endl;
    return 0;
}
"""
    res = compile_and_run(cpp_code, 'cpp', '', sandbox_dir)
    print("Results:", res)
    assert res['compiled'] is True
    assert "Hello, C++ sandbox!" in res['execution_output']
    assert res['exit_code'] == 0
    print("--> C++ Compiler & Sandbox: PASSED")

    # Test 4: Static analysis
    print("\n[Test 4] Testing AST / Lint checks...")
    bad_py_code = """
def broken_syntax(
    print("missing closing paren")
"""
    issues = run_static_analysis(bad_py_code, 'python')
    print("Issues found in buggy Python:", issues)
    assert len(issues) > 0
    assert any(iss['severity'] == 'error' for iss in issues)
    print("--> Static Analysis: PASSED")

    print("\n=========================================")
    print(" ALL LOCAL SANDBOX TESTS COMPLETED ")
    print("=========================================")

if __name__ == "__main__":
    run_tests()
