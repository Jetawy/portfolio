/* =========================
   PROJECTS CAROUSEL
   ========================= */

const track = document.querySelector('.projects-track');
const cards = document.querySelectorAll('.project-card');
const dots = document.querySelectorAll('.dot');

if (track && cards.length) {
    const cardGap = 24;
    const cardWidth = cards[0].offsetWidth + cardGap;
    const totalCards = 5;

    let index = 0;
    let isDragging = false;
    let startX = 0;
    let currentTranslate = 0;
    let prevTranslate = 0;

    function updateCarousel(withTransition = true) {
        track.style.transition = withTransition ? 'transform 0.4s ease' : 'none';
        track.style.transform = `translateX(${-index * cardWidth}px)`;

        dots.forEach(dot => dot.classList.remove('active'));
        if (dots.length) {
            dots[index % totalCards].classList.add('active');
        }
    }

    track.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX;
        prevTranslate = -index * cardWidth;
        track.style.transition = 'none';
        track.classList.add('is-dragging');
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const delta = e.clientX - startX;
        currentTranslate = prevTranslate + delta;
        track.style.transform = `translateX(${currentTranslate}px)`;
    });

    window.addEventListener('mouseup', () => {
        if (!isDragging) return;
        isDragging = false;
        track.classList.remove('is-dragging');

        const movedBy = currentTranslate - prevTranslate;

        if (movedBy < -80) index++;
        if (movedBy > 80) index--;

        // Infinito hacia atrás
        if (index < 0) {
            index = totalCards;
            updateCarousel(false);
            requestAnimationFrame(() => {
                index--;
                updateCarousel(true);
            });
            return;
        }

        // Infinito hacia delante
        if (index >= totalCards * 2) {
            index = totalCards;
            updateCarousel(false);
            requestAnimationFrame(() => {
                index++;
                updateCarousel(true);
            });
            return;
        }

        updateCarousel(true);
    });

    dots.forEach((dot, i) => {
        dot.addEventListener('click', () => {
            index = i;
            updateCarousel(true);
        });
    });
}


/* =========================
   FORMS (CONTACT + FOOTER)
   ========================= */

document
    .querySelectorAll('form[action*="formspree.io"]')
    .forEach((form) => {
        const successMessage = form.querySelector('.form-success');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = new FormData(form);

            try {
                const response = await fetch(form.action, {
                    method: form.method,
                    body: formData,
                    headers: {
                        'Accept': 'application/json'
                    }
                });

                if (response.ok) {
                    form.reset();

                    if (successMessage) {
                        successMessage.hidden = false;
                        successMessage.classList.add('is-visible');
                    }
                } else {
                    alert('Oops! Something went wrong. Please try again.');
                }

            } catch (error) {
                alert('Network error. Please try again later.');
            }
        });
    });


/* =========================
   SCROLL TOP BUTTON
   ========================= */

const scrollTopBtn = document.querySelector('.scroll-top');

window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
        scrollTopBtn.classList.add('is-visible');
    } else {
        scrollTopBtn.classList.remove('is-visible');
    }
});

scrollTopBtn.addEventListener('click', () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});
