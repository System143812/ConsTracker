// register.js

document.addEventListener('DOMContentLoaded', () => {
    const emailInput = document.getElementById('emailBox');
    const passwordInput = document.getElementById('passwordBox');
    const generatePasswordBtn = document.getElementById('generatePasswordBtn');
    const okBtn = document.getElementById('okBtn');
    const registerForm = document.getElementById('registerForm');
    const emailError = document.getElementById('emailError');
    const passwordError = document.getElementById('passwordError');
    const loadingOverlay = document.getElementById('loadingOverlay');
    
    // Fade in elements on load
    const brandLogo = document.getElementById('brandLogo');
    const brandInfo = document.getElementById('brandInfo');
    const loginForm = document.querySelector('.login-form');

    setTimeout(() => {
        if(brandLogo) brandLogo.style.opacity = "1";
        if(brandInfo) brandInfo.style.opacity = "1";
        if(loginForm) loginForm.style.opacity = "1";
    }, 100);

    
    let generatedPassword = '';

    // Email validation
    emailInput.addEventListener('input', () => {
        const email = emailInput.value.trim();
        
        if (validateEmail(email)) {
            emailError.textContent = '';
            emailError.style.display = 'none';
            generatePasswordBtn.disabled = false;
        } else if (email.length > 0) {
            emailError.textContent = 'Please enter a valid email address';
            emailError.style.display = 'block';
            generatePasswordBtn.disabled = true;
            okBtn.disabled = true;
            passwordInput.value = '';
        } else {
            emailError.textContent = '';
            emailError.style.display = 'none';
            generatePasswordBtn.disabled = true;
            okBtn.disabled = true;
            passwordInput.value = '';
        }
    });

    // Generate Password button handler
    generatePasswordBtn.addEventListener('click', async () => {
        const email = emailInput.value.trim();
        
        if (!validateEmail(email)) {
            showError(emailError, 'Please enter a valid email first');
            return;
        }

        // Show loading
        loadingOverlay.style.display = 'flex';

        try {
            // Call Express API to generate and send password
            const response = await fetch('/api/register/generate-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (response.ok) {
                // Show asterisks in password field
                passwordInput.value = '********';
                
                // Enable OK button
                okBtn.disabled = false;
                
                // Store the generated password for reference
                generatedPassword = data.password || '********';
                
                // Change button text and disable it
                generatePasswordBtn.disabled = true;
                generatePasswordBtn.textContent = 'Sent!';
                
                // Show success message
                showSuccess(passwordError, 'Password sent to your email!');
            } else {
                throw new Error(data.message || 'Failed to generate password');
            }
        } catch (error) {
            showError(passwordError, error.message || 'Failed to generate password. Please try again.');
            console.error('Error:', error);
        } finally {
            loadingOverlay.style.display = 'none';
        }
    });

    // OK button handler - redirect to login page
    okBtn.addEventListener('click', () => {
        window.location.href = '/';
    });

    // Prevent form submission
    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
    });

    // Helper functions
    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    function showError(element, message) {
        element.textContent = message;
        element.style.display = 'block';
        element.style.color = '#dc3545';
    }

    function showSuccess(element, message) {
        element.textContent = message;
        element.style.display = 'block';
        element.style.color = '#28a745';
    }
});