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

/* =========================
   SCROLLSPY - Active nav item on scroll
   ========================= */

(function () {
    const navItems = Array.from(document.querySelectorAll('.nav-item'));
    if (!navItems.length) return;

    const idToNav = {};
    navItems.forEach((li) => {
        const a = li.querySelector('a');
        if (!a) return;
        const href = a.getAttribute('href');
        if (!href || !href.startsWith('#')) return;
        const id = href.slice(1);
        if (!idToNav[id]) idToNav[id] = [];
        idToNav[id].push(li);
    });

    const sections = Object.keys(idToNav).map((id) => document.getElementById(id)).filter(Boolean);
    if (!sections.length) return;

    let currentActive = document.querySelector('.nav-item.active') || null;
    const header = document.querySelector('.site-header');
    const headerHeight = header ? header.getBoundingClientRect().height : 0;

    function setActive(targetLiOrArray) {
        // accept a single li or an array of li's
        const newLis = Array.isArray(targetLiOrArray) ? targetLiOrArray : [targetLiOrArray];
        if (!newLis.length) return;
        // remove active from all nav items
        navItems.forEach((n) => n.classList.remove('active'));
        // add active to each new li
        newLis.forEach((n) => n.classList.add('active'));
        // keep reference to the first as currentActive
        currentActive = newLis[0] || null;
    }

    // choose the section that is nearest to the header (last one scrolled past)
    function detectActiveSection() {
        // prefer the section whose top is <= headerHeight + smallOffset and is the closest to header
        const smallOffset = 5;
        let candidate = null;

        for (const s of sections) {
            const rect = s.getBoundingClientRect();
            if (rect.top <= headerHeight + smallOffset) {
                if (!candidate || rect.top > candidate.rectTop) candidate = { el: s, rectTop: rect.top };
            }
        }

        if (!candidate) {
            // if none passed the header, pick the nearest one below the header
            let nearest = null;
            for (const s of sections) {
                const rect = s.getBoundingClientRect();
                if (!nearest || rect.top < nearest.rectTop) nearest = { el: s, rectTop: rect.top };
            }
            candidate = nearest;
        }

        if (candidate && candidate.el && candidate.el.id) {
            const lis = idToNav[candidate.el.id] || [];
            setActive(lis);
        }
    }

    let ticking = false;
    function onScroll() {
        if (!ticking) {
            ticking = true;
            requestAnimationFrame(() => {
                detectActiveSection();
                ticking = false;
            });
        }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', () => detectActiveSection());
    window.addEventListener('load', () => detectActiveSection());

    // immediate feedback when clicking nav links
    navItems.forEach((li) => {
        const a = li.querySelector('a');
        if (!a) return;
        a.addEventListener('click', () => setActive(li));
    });

    // initial detection
    detectActiveSection();
})();

/* MOBILE NAV TOGGLE */
(function () {
    const toggle = document.querySelector('.nav-toggle');
    const mobileNav = document.querySelector('.header-center-mobile');
    if (!toggle || !mobileNav) return;

    const menuIcon = 'assets/icons/menu.png';
    const closeIcon = 'assets/icons/close.svg';
    let savedScrollY = 0;

    function setOpen(open) {
        mobileNav.classList.toggle('is-open', open);
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        const img = toggle.querySelector('img');
        if (img) img.src = open ? closeIcon : menuIcon;

        // position the dropdown immediately under the header and set height
        const headerEl = document.querySelector('.site-header');
        const headerRect = headerEl ? headerEl.getBoundingClientRect() : { bottom: 0 };
        const top = Math.round(headerRect.bottom);
        // compute remaining height so the panel fills to the bottom of the viewport
        const remaining = Math.max(0, window.innerHeight - top);

        if (open) {
            // save scroll and lock body to prevent background scroll
            savedScrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
            document.documentElement.style.overflow = 'hidden';
            document.body.style.position = 'fixed';
            document.body.style.top = `-${savedScrollY}px`;
            document.body.style.left = '0';
            document.body.style.right = '0';

            mobileNav.style.top = top + 'px';
            mobileNav.style.height = remaining + 'px';
        } else {
            // restore scrolling
            document.documentElement.style.overflow = '';
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.left = '';
            document.body.style.right = '';
            window.scrollTo(0, savedScrollY || 0);

            mobileNav.style.top = '';
            mobileNav.style.height = '';
        }
    }

    toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        setOpen(!mobileNav.classList.contains('is-open'));
    });

    // (mobile-close button removed from HTML — closing handled by nav-toggle only)

    // close when clicking a link inside
    mobileNav.querySelectorAll('a').forEach((a) => {
        a.addEventListener('click', () => setOpen(false));
    });

    // close on outside click
    document.addEventListener('click', (e) => {
        if (!mobileNav.classList.contains('is-open')) return;
        const isInside = mobileNav.contains(e.target) || toggle.contains(e.target);
        if (!isInside) setOpen(false);
    });

    // close on resize to larger screens
    window.addEventListener('resize', () => {
        if (window.innerWidth >= 768) setOpen(false);
        if (mobileNav.classList.contains('is-open')) setOpen(true);
    });
})();