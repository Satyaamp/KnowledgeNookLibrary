document.addEventListener('DOMContentLoaded', () => {
    // Mobile Menu Toggle
    const hamburger = document.querySelector('.hamburger');
    const mobileMenu = document.querySelector('.mobile-menu');

    hamburger.addEventListener('click', () => {
        mobileMenu.classList.toggle('active');
        // Change icon between bars & times
        const icon = hamburger.querySelector('i');
        if (mobileMenu.classList.contains('active')) {
            icon.classList.remove('fa-bars');
            icon.classList.add('fa-xmark');
        } else {
            icon.classList.remove('fa-xmark');
            icon.classList.add('fa-bars');
        }
    });

    // Close mobile menu on link click
    document.querySelectorAll('.mobile-nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            mobileMenu.classList.remove('active');
            hamburger.querySelector('i').classList.replace('fa-xmark', 'fa-bars');
        });
    });

    // Navbar background change on scroll
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.style.background = 'rgba(255, 255, 255, 0.98)';
            navbar.style.boxShadow = 'var(--shadow-md)';
        } else {
            navbar.style.background = 'rgba(255, 255, 255, 0.95)';
            navbar.style.boxShadow = 'var(--shadow-sm)';
        }
    });

    // --- Placeholder Logic for Future Backend Integrations --- //

    // 1. Fetch Stats (Total Seats, Available, etc.)
    async function fetchLibraryStats() {
        try {
            // Future API Call: const res = await fetch('/api/public/stats'); const data = await res.json();

            // Placeholder data simulation
            setTimeout(() => {
                // We assume we fetched real-time stats
                /*
                document.getElementById('stat-total-seats').textContent = data.totalSeats;
                document.getElementById('stat-avail-seats').textContent = data.availableSeats;
                document.getElementById('box-total').textContent = data.totalSeats;
                document.getElementById('box-avail').textContent = data.availableSeats;
                */
            }, 500);

        } catch (e) {
            console.error('Error fetching stats', e);
        }
    }

    // 2. Fetch Latest Announcements
    async function fetchLatestAnnouncements() {
        try {
            // Future API Call: const res = await fetch('/api/announcements?limit=3'); const data = await res.json();
            // Render data dynamically into #announcements-grid
        } catch (e) {
            console.error('Error fetching announcements', e);
        }
    }

    // Init fetch loops
    fetchLibraryStats();
    fetchLatestAnnouncements();
});
