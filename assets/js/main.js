/**
 * THE ASSEMBLY OF SONS — Site-wide behaviour: nav, mobile menu,
 * scroll reveal, and the donation account copy button.
 */
(function () {
  "use strict";

  // ---- Sticky nav opacity ----
  const nav = document.getElementById("site-nav");
  if (nav) {
    const onScroll = () => {
      nav.classList.toggle("is-scrolled", window.scrollY > 24);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  // ---- Mobile menu ----
  const navToggle = document.getElementById("nav-toggle");
  const navMobile = document.getElementById("nav-mobile");
  if (navToggle && navMobile) {
    const closeMenu = () => {
      navMobile.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
    };
    const openMenu = () => {
      navMobile.classList.add("is-open");
      navToggle.setAttribute("aria-expanded", "true");
      document.body.style.overflow = "hidden";
    };
    navToggle.addEventListener("click", () => {
      const isOpen = navMobile.classList.contains("is-open");
      isOpen ? closeMenu() : openMenu();
    });
    navMobile.querySelectorAll("a").forEach((a) => a.addEventListener("click", closeMenu));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeMenu();
    });
  }

  // ---- Scroll reveal ----
  const revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealEls.length) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  }

  // ---- Back to top ----
  const backToTop = document.getElementById("back-to-top");
  if (backToTop) {
    const onScrollTop = () => {
      backToTop.classList.toggle("is-visible", window.scrollY > 600);
    };
    onScrollTop();
    window.addEventListener("scroll", onScrollTop, { passive: true });
    backToTop.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  // ---- Reader reviews: render curated list ----
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
    ));
  }
  const reviewsGrid = document.getElementById("reviews-grid");
  const reviewsEmpty = document.getElementById("reviews-empty");
  if (reviewsGrid && reviewsEmpty && typeof REVIEWS !== "undefined") {
    if (REVIEWS.length) {
      reviewsGrid.innerHTML = REVIEWS.map((r) => {
        const loc = r.location ? "<span>" + escapeHtml(r.location) + "</span>" : "";
        return (
          '<article class="review-card"><blockquote>&ldquo;' +
          escapeHtml(r.text) +
          '&rdquo;</blockquote><cite>' +
          escapeHtml(r.name) +
          loc +
          "</cite></article>"
        );
      }).join("");
      reviewsEmpty.hidden = true;
    } else {
      reviewsEmpty.hidden = false;
    }
  }

  // ---- Reader reviews: submission form ----
  const reviewForm = document.getElementById("review-form");
  const reviewNote = document.getElementById("review-form-note");
  const reviewSubmitBtn = document.getElementById("review-submit");
  if (reviewForm && reviewNote && reviewSubmitBtn) {
    reviewForm.addEventListener("submit", (e) => {
      e.preventDefault();

      // Honeypot: if this hidden field got filled, it's almost certainly a bot — drop it silently.
      const honeypot = reviewForm.querySelector('[name="_gotcha"]');
      if (honeypot && honeypot.value) return;

      const endpoint = typeof CONFIG !== "undefined" ? CONFIG.reviewFormEndpoint : "";
      if (!endpoint) {
        reviewNote.textContent = "Review submissions are launching soon — please check back shortly.";
        reviewNote.className = "review-form-note is-error";
        return;
      }

      reviewSubmitBtn.disabled = true;
      reviewSubmitBtn.textContent = "Sending...";
      reviewNote.textContent = "";
      reviewNote.className = "review-form-note";

      fetch(endpoint, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: new FormData(reviewForm),
      })
        .then((res) => {
          if (!res.ok) throw new Error("Submission failed");
          reviewNote.textContent = "Thank you for sharing! Your review will appear here once it's been reviewed.";
          reviewNote.className = "review-form-note is-success";
          reviewForm.reset();
        })
        .catch(() => {
          reviewNote.textContent = "Something went wrong sending your review. Please try again shortly.";
          reviewNote.className = "review-form-note is-error";
        })
        .finally(() => {
          reviewSubmitBtn.disabled = false;
          reviewSubmitBtn.textContent = "Share Your Review";
        });
    });
  }

  // ---- Donation account copy button ----
  const copyBtn = document.getElementById("copy-account-btn");
  const copyFeedback = document.getElementById("copy-feedback");
  if (copyBtn && typeof CONFIG !== "undefined") {
    copyBtn.addEventListener("click", async () => {
      const value = CONFIG.donationAccount;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(value);
        } else {
          const temp = document.createElement("textarea");
          temp.value = value;
          temp.style.position = "fixed";
          temp.style.opacity = "0";
          document.body.appendChild(temp);
          temp.select();
          document.execCommand("copy");
          document.body.removeChild(temp);
        }
        if (copyFeedback) {
          copyFeedback.textContent = "Account number copied. Thank you for partnering with us.";
          copyFeedback.classList.add("is-visible");
          setTimeout(() => copyFeedback.classList.remove("is-visible"), 4000);
        }
      } catch (e) {
        if (copyFeedback) {
          copyFeedback.textContent = "Copy failed — the account number is " + value + ".";
          copyFeedback.classList.add("is-visible");
        }
      }
    });
  }
})();

// ---- Grace Through Faith: second book feature on the Assembly homepage ----
(function () {
  "use strict";
  const existing = document.querySelector(".book-section");
  if (!existing || document.getElementById("grace-through-faith-book")) return;

  const section = document.createElement("section");
  section.className = "book-section section-pad";
  section.id = "grace-through-faith-book";
  section.innerHTML = `
    <div class="container">
      <div class="book-grid">
        <div class="book-mockup reveal">
          <div class="book-cover">
            <img src="https://raw.githubusercontent.com/FIBRE007/The-life-of-grace/0b2eabfef134e787b2cc63d24b5ec7f3b138a664/grace-through-faith/cover.jpg"
                 width="360" height="540"
                 alt="Book cover: The Psychology of Grace Through Faith — Working From Grace, Not for Grace, by Fadoju Tosin"
                 loading="lazy">
          </div>
        </div>
        <div class="book-meta reveal">
          <p class="eyebrow">New Book</p>
          <h2 class="section-heading">The Psychology of Grace Through Faith</h2>
          <p class="section-lede" style="font-style:italic; color:var(--color-gold-soft); margin-top:-0.5em;">Working From Grace, Not for Grace</p>
          <p class="section-lede">A practical exploration of what changes when grace shapes not only salvation, but the way we think, work, expect, manage resources, relate to people and respond to setbacks.</p>
          <p class="book-author">By Fadoju Tosin · Published by The Assembly of Sons</p>
          <div class="book-actions">
            <a class="btn btn-primary" href="/grace-through-faith/">Explore the Book</a>
            <a class="btn btn-outline" href="/grace-through-faith/reader.html#preface">Start Reading</a>
          </div>
        </div>
      </div>
    </div>`;
  existing.insertAdjacentElement("afterend", section);

  // The new section is added after the original reveal observer has been set up,
  // so make its reveal elements visible immediately instead of leaving them hidden.
  section.querySelectorAll(".reveal").forEach((el) => el.classList.add("is-visible"));
})();
