// Buggy JavaScript Sample

function checkUserAccess(role) {
    let accessGranted = false;
    
    // Logical bug: assignment '=' inside conditional instead of comparison '==='
    // This always evaluates to true and grants access!
    if (role = "admin") {
        accessGranted = true;
    }
    
    return accessGranted;
}

function runDynamicScript(userInput) {
    // Security vulnerability: eval() runs arbitrary code from inputs
    console.log("Evaluating script dynamically...");
    eval(userInput);
}

function processCalculation(a, b) {
    // ReferenceError: usage of undeclared variables (strict mode violation)
    // inside javascript engines
    result = a + b;
    return result;
}

console.log("=== Testing JS Agent ===");
console.log("Access for role 'user':", checkUserAccess("user")); // Unexpectedly true
try {
    processCalculation(10, 20);
} catch (e) {
    console.log("Error processing calculation:", e.message);
}
