document.addEventListener('DOMContentLoaded', function() {

    // Function to load Navbar and Footer
    function loadNavbarAndFooter() {
        const navbarPlaceholder = document.getElementById('navbar-placeholder');
        if (navbarPlaceholder) {
            fetch('navbar.html')
                .then(response => response.text())
                .then(data => {
                    navbarPlaceholder.innerHTML = data;

                    // Add event listener to hide mobile nav on link click
                    const navLinks = document.querySelectorAll('.navbar-nav .nav-link');
                    const navCollapse = document.getElementById('navbarNav');
                    if (navCollapse) {
                        const bsCollapse = new bootstrap.Collapse(navCollapse, {
                            toggle: false
                        });
                        navLinks.forEach(link => {
                            link.addEventListener('click', () => {
                                if (bsCollapse._isShown()) {
                                    bsCollapse.hide();
                                }
                            });
                        });
                    }
                });
        }

        const footerPlaceholder = document.getElementById('footer-placeholder');
        if (footerPlaceholder) {
            fetch('footer.html')
                .then(response => response.text())
                .then(data => {
                    footerPlaceholder.innerHTML = data;
                });
        }
    }

    loadNavbarAndFooter();

    // Location Scroller in Top Bar
    const locations = ["Pune Center", "Bidar Center", "Bhalki Center"];
    const locationElement = document.getElementById('location-scroller');
    let currentIndex = 0;

    if (locationElement) {
        setInterval(() => {
            currentIndex = (currentIndex + 1) % locations.length;
            locationElement.style.opacity = 0;
            setTimeout(() => {
                locationElement.textContent = locations[currentIndex];
                locationElement.style.opacity = 1;
            }, 500); // Fade transition
        }, 2000);
    }

    // Stats Counter on Scroll
    const statsSection = document.querySelector('.stats-section');
    let hasAnimated = false;

    const countUp = (element) => {
        const target = parseInt(element.getAttribute('data-target'), 10);
        const duration = 2000; // 2 seconds
        let current = 0;
        const increment = target / (duration / 16); // 60 fps

        const updateCount = () => {
            current += increment;
            if (current < target) {
                element.textContent = Math.ceil(current).toLocaleString();
                requestAnimationFrame(updateCount);
            } else {
                element.textContent = target.toLocaleString() + (element.getAttribute('data-suffix') || '');
            }
        };
        updateCount();
    };

    if (statsSection) {
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && !hasAnimated) {
                hasAnimated = true;
                const counters = document.querySelectorAll('.stat-counter');
                counters.forEach(counter => countUp(counter));
                observer.disconnect();
            }
        }, { threshold: 0.5 });

        observer.observe(statsSection);
    }
});