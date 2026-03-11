document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const errorMsg = document.getElementById('loginError');

    // Redirect if already logged in
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');

    if (token && role) {
        if (role === 'admin') window.location.href = '/admin/dashboard.html';
        if (role === 'student') window.location.href = '/student/dashboard.html';
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const role = document.getElementById('role').value;

            try {
                const data = await API.auth.login({ email, password, role });

                localStorage.setItem('token', data.token);
                localStorage.setItem('role', data.role);
                localStorage.setItem('userId', data._id);
                localStorage.setItem('name', data.name);


                if (data.role === 'admin') {
                    window.location.href = '/admin/dashboard.html';
                } else {
                    window.location.href = '/student/dashboard.html';
                }

            } catch (error) {
                errorMsg.textContent = error.message;
            }
        });
    }
});
