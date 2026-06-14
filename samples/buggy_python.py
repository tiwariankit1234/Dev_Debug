# Buggy Python Sample

def find_user_by_query(user_input):
    # Security vulnerability: SQL Injection via string formatting
    query = f"SELECT * FROM users WHERE username = '{user_input}'"
    print(f"Executing query: {query}")
    return query

def calculate_factorial_recursive(n):
    # Logical bug: Infinite recursion if n is negative (missing base cases validation)
    if n == 0:
        return 1
    return n * calculate_factorial_recursive(n - 1)

def find_item_in_list(target, items):
    found = False
    for item in items:
        if item == target:
            found = True
            # Logical bug: missing 'break' statement makes it inefficient
            # and may overwrite state if handling duplicates incorrectly.
    return found

if __name__ == "__main__":
    print("=== Testing Python Agent ===")
    find_user_by_query("admin' OR '1'='1")
    
    # This will trigger a RecursionError (Runtime error)
    print("Factorial of -1:")
    try:
        calculate_factorial_recursive(-1)
    except RecursionError as e:
        print(f"Caught recursion crash: {e}")
