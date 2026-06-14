#include <iostream>
#include <cstdio>

void division_by_zero() {
    int numerator = 10;
    int denominator = 0;
    std::cout << "Attempting division by zero..." << std::endl;
    int result = numerator / denominator; // Logical bug: Runtime Crash
    std::cout << "Result: " << result << std::endl;
}

void buffer_overflow() {
    char username[8];
    std::cout << "Enter username (unbounded input): ";
    // Security vulnerability: gets() does not perform bound checks
    gets(username); 
    std::cout << "Welcome, " << username << "!" << std::endl;
}

void memory_leak() {
    int* data = new int[100];
    data[0] = 42;
    std::cout << "Stored " << data[0] << " in heap memory." << std::endl;
    // Memory leak: delete[] data is missing
}

int main() {
    std::cout << "=== Running Buggy C++ Code ===" << std::endl;
    // Commenting out division_by_zero() to allow gets() execution
    // division_by_zero();
    buffer_overflow();
    memory_leak();
    return 0;
}
