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

/* =========================
   LOOP TABS CAROUSEL
   ========================= */
document.querySelectorAll('.tabs-carousel').forEach((carousel, idx) => {
    const track = carousel.querySelector('.tabs-track');
    if (!track) return;

    // direction: 'left' means content moves left (standard), 'right' moves right
    const direction = carousel.dataset.direction === 'right' ? 'right' : 'left';
    const speedPxPerSec = 42; // pixels per second, tweak to change visual speed

    // Ensure we start from the original HTML (avoid double-duplication on repeated runs)
    const originalHTML = track.dataset.originalHtml || track.innerHTML;
    if (!track.dataset.originalHtml) track.dataset.originalHtml = originalHTML;
    track.innerHTML = originalHTML;

    // Wrap the original set of tabs into a single sequence container
    const seq = document.createElement('div');
    seq.className = 'tabs-seq';
    seq.style.display = 'flex';
    // Move original children into seq
    while (track.firstChild) seq.appendChild(track.firstChild);
    track.appendChild(seq);

    // Clone the sequence until the track's scrollWidth is at least containerWidth + one sequence width
    // This guarantees there is always content covering the viewport while one sequence scrolls out.
    const containerWidth = carousel.clientWidth;
    let seqWidth = Math.max(1, Math.round(seq.getBoundingClientRect().width));
    let copies = 1;
    while (track.scrollWidth < containerWidth + seqWidth) {
        track.appendChild(seq.cloneNode(true));
        copies++;
    }

    track.style.willChange = 'transform';

    let singleWidth = seqWidth; // width of one sequence
    let offset = 0; // accumulated distance moved in pixels (always increasing)
    let rafId = null;
    let lastTime = null;

    function measure() {
        const seqEl = track.querySelector('.tabs-seq');
        singleWidth = seqEl ? Math.round(seqEl.getBoundingClientRect().width) : 0;
        // ensure enough clones to avoid gaps after a resize
        const containerW = carousel.clientWidth;
        if (singleWidth && track.scrollWidth < containerW + singleWidth) {
            // append clones until we cover viewport + one sequence
            while (track.scrollWidth < containerW + singleWidth) {
                track.appendChild(seqEl.cloneNode(true));
            }
        }
        // keep offset within [0, singleWidth) to avoid large numbers after resize
        if (singleWidth) offset = offset % singleWidth;
    }

    // stable modulo for positive numbers (offset always positive)
    function loopedOffset() {
        if (!singleWidth) return 0;
        return offset - Math.floor(offset / singleWidth) * singleWidth;
    }

    function step(timestamp) {
        if (lastTime == null) lastTime = timestamp;
        const dt = Math.min(64, timestamp - lastTime); // clamp delta to avoid big jumps
        lastTime = timestamp;

        // advance offset by speed * time
        offset += (speedPxPerSec * dt) / 1000;

        const loop = loopedOffset();

        // compute transform using pixel values only. Using translate3d for GPU.
        let x;
        if (direction === 'left') {
            // move content left continuously
            x = -loop;
        } else {
            // move content right continuously: shift so the duplicated half flows in
            x = -(singleWidth - loop);
        }

        track.style.transform = `translate3d(${x}px,0,0)`;
        rafId = requestAnimationFrame(step);
    }

    // ResizeObserver + font-ready to measure accurate widths and keep continuity
    // On resize we must pause the animation, adjust clones/measurements and resume
    const ro = new ResizeObserver(() => {
        // pause animation
        if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }

        // read current visual translateX (px) to preserve it after DOM changes
        let prevX = 0;
        try {
            const cs = getComputedStyle(track).transform;
            const dm = new DOMMatrixReadOnly(cs === 'none' ? 'matrix(1,0,0,1,0,0)' : cs);
            prevX = dm.m41;
        } catch (e) {
            prevX = 0;
        }

        // re-measure and ensure enough clones exist
        measure();

        // compute a loop value in pixels that preserves visual position
        const seqEl = track.querySelector('.tabs-seq');
        const newSingle = seqEl ? Math.round(seqEl.getBoundingClientRect().width) : 0;
        if (!newSingle) {
            // nothing to do, restart
            lastTime = null;
            rafId = requestAnimationFrame(step);
            return;
        }

        let loop;
        if (direction === 'left') {
            loop = -prevX; // prevX = -oldLoop
        } else {
            loop = newSingle + prevX; // prevX = -(oldSingle - oldLoop)
        }

        // normalize into [0, newSingle)
        loop = ((loop % newSingle) + newSingle) % newSingle;
        offset = loop;

        // set transform to exact pixel value that matches the computed loop
        const desiredX = direction === 'left' ? -loop : -(newSingle - loop);
        track.style.transform = `translate3d(${desiredX}px,0,0)`;

        // resume animation
        lastTime = null;
        rafId = requestAnimationFrame(step);
    });

    // start when fonts are ready and after a layout frame to get accurate sizes
    function start() {
        measure();
        // start offset at a small non-zero value to avoid visually aligning to seam exactly
        if (!offset) offset = Math.random() * (singleWidth || 1);
        lastTime = null;
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(step);
        ro.observe(carousel);
    }

    // stop on page visibility change to save CPU
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            if (rafId) cancelAnimationFrame(rafId);
            rafId = null;
        } else if (!rafId) {
            lastTime = null;
            rafId = requestAnimationFrame(step);
        }
    });

    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(start).catch(start);
    } else {
        // fallback: wait one frame then start
        requestAnimationFrame(start);
    }
});