import os
import sys
import json
import uuid
import subprocess
import shutil
import ast
import re
import urllib.request
import urllib.error
import time

def detect_language(code, lang_param):
    if lang_param != "auto":
        return lang_param.lower()
    
    # Simple heuristic checks
    if "#include" in code or "int main(" in code:
        if "std::" in code or "cout" in code or "cin" in code:
            return "cpp"
        return "c"
    if "public class" in code and "static void main" in code:
        return "java"
    if "def " in code or "import " in code or "print(" in code:
        # Check for semicolons at end of lines or other JS indicators
        if "const " not in code and "let " not in code and "function " not in code:
            return "python"
    if "const " in code or "let " in code or "function " in code or "console.log" in code:
        return "javascript"
    
    return "python" # Default fallback

def run_static_analysis(code, language):
    issues = []
    
    # Python AST parsing check
    if language == "python":
        try:
            ast.parse(code)
            issues.append({
                "severity": "info",
                "message": "AST parsed successfully. No syntax errors detected."
            })
        except SyntaxError as e:
            issues.append({
                "severity": "error",
                "line": e.lineno,
                "offset": e.offset,
                "message": f"SyntaxError: {e.msg}",
                "text": e.text
            })
            
    # Basic lint checks for C/C++/Java/JS
    elif language in ["c", "cpp"]:
        # Check for dangerous functions
        if "gets(" in code:
            issues.append({
                "severity": "warning",
                "message": "Use of dangerous function 'gets()' detected. It is vulnerable to buffer overflow. Use 'fgets()' instead."
            })
        if "strcpy(" in code:
            issues.append({
                "severity": "warning",
                "message": "Use of 'strcpy()' detected. This can lead to buffer overflows if boundaries aren't verified. Consider 'strncpy()'."
            })
            
    elif language == "javascript":
        if "eval(" in code:
            issues.append({
                "severity": "warning",
                "message": "Use of 'eval()' detected. This can lead to security vulnerabilities and poor performance."
            })
        if "var " in code:
            issues.append({
                "severity": "info",
                "message": "Consider using 'let' or 'const' instead of 'var' for modern block-scoping."
            })
            
    return issues

def compile_and_run(code, language, input_data, sandbox_dir):
    os.makedirs(sandbox_dir, exist_ok=True)
    job_id = str(uuid.uuid4())[:8]
    
    result = {
        "compiled": True,
        "compile_output": "",
        "execution_output": "",
        "execution_error": "",
        "exit_code": 0,
        "run_time_ms": 0,
        "success": True
    }
    
    # Setup filenames
    if language == "python":
        src_file = os.path.join(sandbox_dir, f"code_{job_id}.py")
    elif language == "javascript":
        src_file = os.path.join(sandbox_dir, f"code_{job_id}.js")
    elif language == "c":
        src_file = os.path.join(sandbox_dir, f"code_{job_id}.c")
        exe_file = os.path.join(sandbox_dir, f"code_{job_id}.exe")
    elif language == "cpp":
        src_file = os.path.join(sandbox_dir, f"code_{job_id}.cpp")
        exe_file = os.path.join(sandbox_dir, f"code_{job_id}.exe")
    elif language == "java":
        # Java needs class name to match file name. We'll search for the public class name or use Main
        match = re.search(r"public\s+class\s+(\w+)", code)
        class_name = match.group(1) if match else "Main"
        
        # Replace the class name to match or just write it as class_name.java
        src_file = os.path.join(sandbox_dir, f"{class_name}.java")
    else:
        result["success"] = False
        result["execution_error"] = f"Unsupported language: {language}"
        return result

    # Write code to file
    with open(src_file, "w", encoding="utf-8") as f:
        f.write(code)
        
    start_time = time.time()
    
    try:
        # Compilation Step
        if language in ["c", "cpp"]:
            compiler = "gcc" if language == "c" else "g++"
            comp_proc = subprocess.run(
                [compiler, src_file, "-o", exe_file],
                capture_output=True,
                text=True,
                timeout=5
            )
            result["compile_output"] = (comp_proc.stdout + "\n" + comp_proc.stderr).strip()
            if comp_proc.returncode != 0:
                result["compiled"] = False
                result["success"] = False
                result["execution_error"] = "Compilation Failed"
                return result
            
        elif language == "java":
            # Check if javac exists
            if not shutil.which("javac"):
                result["compiled"] = False
                result["success"] = False
                result["compile_output"] = "Java compiler 'javac' is not installed or not in PATH."
                result["execution_error"] = "Compilation Skipped: javac missing"
                return result
            
            comp_proc = subprocess.run(
                ["javac", src_file],
                capture_output=True,
                text=True,
                timeout=5
            )
            result["compile_output"] = (comp_proc.stdout + "\n" + comp_proc.stderr).strip()
            if comp_proc.returncode != 0:
                result["compiled"] = False
                result["success"] = False
                result["execution_error"] = "Compilation Failed"
                return result
            
        # Execution Step
        if language == "python":
            cmd = [sys.executable, src_file]
        elif language == "javascript":
            cmd = ["node", src_file]
        elif language in ["c", "cpp"]:
            cmd = [exe_file]
        elif language == "java":
            cmd = ["java", "-cp", sandbox_dir, class_name]
            
        run_proc = subprocess.run(
            cmd,
            input=input_data,
            capture_output=True,
            text=True,
            timeout=5
        )
        
        result["execution_output"] = run_proc.stdout
        result["execution_error"] = run_proc.stderr
        result["exit_code"] = run_proc.returncode
        result["run_time_ms"] = int((time.time() - start_time) * 1000)
        
        if run_proc.returncode != 0:
            result["success"] = False
            
    except subprocess.TimeoutExpired:
        result["success"] = False
        result["execution_error"] = "Execution Timeout: Code execution exceeded the 5-second limit."
        result["run_time_ms"] = int((time.time() - start_time) * 1000)
    except Exception as e:
        result["success"] = False
        result["execution_error"] = f"Runtime Exception: {str(e)}"
    finally:
        # Clean up sandbox files
        try:
            if os.path.exists(src_file):
                os.remove(src_file)
            if language in ["c", "cpp"] and 'exe_file' in locals() and os.path.exists(exe_file):
                os.remove(exe_file)
            if language == "java":
                # Remove generated .class files
                for f in os.listdir(sandbox_dir):
                    if f.endswith(".class") and (f.startswith(class_name) or "Main" in f):
                        os.remove(os.path.join(sandbox_dir, f))
        except Exception:
            pass # Ignore cleanup errors
            
    return result

def query_gemini_api(api_key, code, language, static_analysis, run_results):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    
    prompt = f"""
You are the core intelligence of DevDebug Agent, a state-of-the-art multi-language debugging and code review platform.
Analyze the following code, and details of static analysis and dynamic execution inside our secure sandbox.

=== CODE INFORMATION ===
Language: {language}

=== USER CODE ===
```
{code}
```

=== STATIC ANALYSIS ISSUES ===
{json.dumps(static_analysis, indent=2)}

=== SECURE SANDBOX RUNTIME RESULTS ===
Compilation Status: {"Compiled successfully" if run_results.get("compiled") else "Compilation failed/skipped"}
Compiler Output: {run_results.get("compile_output")}
Stdout: {run_results.get("execution_output")}
Stderr: {run_results.get("execution_error")}
Exit Code: {run_results.get("exit_code")}

=== TASK ===
Perform a deep, step-by-step reasoning analysis on the code:
1. Identify any bugs (syntax errors, logical bugs, resource leaks, edge case failures, performance issues).
2. Propose a fully corrected and optimized version of the code that fixes all identified issues.
3. Run a security scan detecting buffer overflows, SQL injections, Cross-Site Scripting (XSS), insecure deserialization, hardcoded secrets, or bad practices.
4. Return a structured JSON response matching the schema defined below. Do not include markdown code block syntax inside the json payload (like ```json ... ```). Provide raw JSON ONLY.

JSON Schema format:
{{
  "detectedLanguage": "C" | "C++" | "Java" | "JavaScript" | "Python",
  "bugs": [
    {{
      "line": 10,
      "severity": "critical" | "warning" | "info",
      "description": "Detailed explanation of the bug, what causes it, and how it behaves.",
      "fix": "Short description of what needs to be changed."
    }}
  ],
  "fixedCode": "Full corrected code here. Preserve spacing and indentation.",
  "securityIssues": [
    {{
      "category": "Buffer Overflow" | "SQL Injection" | "XSS" | "Hardcoded Credentials" | "Insecure Functions" | "Other",
      "severity": "Critical" | "High" | "Medium" | "Low",
      "lines": "Line numbers where the security issue resides (e.g. '12-15' or '5')",
      "description": "Detailed analysis of the vulnerability and why it is risky.",
      "remediation": "How to resolve the vulnerability."
    }}
  ],
  "generalReview": "A high-level summary of the code quality, coding practices, complexity (Time/Space complexity if applicable), and structural suggestions."
}}
"""

    headers = {"Content-Type": "application/json"}
    payload = {
        "contents": [{
            "parts": [{
                "text": prompt
            }]
        }],
        "generationConfig": {
            "responseMimeType": "application/json"
        }
    }
    
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    
    try:
        with urllib.request.urlopen(req) as response:
            response_data = response.read().decode("utf-8")
            res_json = json.loads(response_data)
            
            # Extract text response from Gemini structure
            text_response = res_json['candidates'][0]['content']['parts'][0]['text']
            return json.loads(text_response.strip())
    except urllib.error.HTTPError as e:
        error_msg = e.read().decode("utf-8")
        raise Exception(f"Gemini API HTTP Error {e.code}: {error_msg}")
    except Exception as e:
        raise Exception(f"Failed to query Gemini API: {str(e)}")

def main():
    try:
        # Read parameters from stdin
        input_payload = json.loads(sys.stdin.read())
        
        code = input_payload.get("code", "")
        lang_param = input_payload.get("language", "auto")
        input_data = input_payload.get("input", "")
        api_key = input_payload.get("apiKey", "")
        
        if not api_key:
            print(json.dumps({
                "success": False,
                "error": "Gemini API key is required"
            }))
            return

        # 1. Language Detection
        language = detect_language(code, lang_param)
        
        # 2. Static Analysis
        static_analysis = run_static_analysis(code, language)
        
        # 3. Compile and Run Code inside Sandbox
        sandbox_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "sandbox_temp"))
        run_results = compile_and_run(code, language, input_data, sandbox_dir)
        
        # 4. Query Gemini for detailed AI debugging & review
        ai_report = query_gemini_api(api_key, code, language, static_analysis, run_results)
        
        # 5. Output unified result
        final_report = {
            "success": True,
            "language": language,
            "sandbox": run_results,
            "staticAnalysis": static_analysis,
            "aiReport": ai_report
        }
        
        print(json.dumps(final_report))
        
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e)
        }))

if __name__ == "__main__":
    main()
