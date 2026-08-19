/* Royal Family Academy — Homepage specific interactions */
(function () {
  "use strict";

  /* Hero background slider */
  var slides = document.querySelectorAll(".hero-slide");
  var dots = document.querySelectorAll(".hero-dots button");
  if (slides.length > 1) {
    var index = 0;
    var timer = setInterval(next, 6000);

    function go(i) {
      slides[index].classList.remove("is-active");
      dots[index]?.classList.remove("is-active");
      dots[index]?.setAttribute("aria-selected", "false");
      index = i;
      slides[index].classList.add("is-active");
      dots[index]?.classList.add("is-active");
      dots[index]?.setAttribute("aria-selected", "true");
    }
    function next() { go((index + 1) % slides.length); }

    dots.forEach(function (dot, i) {
      dot.addEventListener("click", function () {
        clearInterval(timer);
        go(i);
        timer = setInterval(next, 6000);
      });
    });
  }

  /* Testimonial carousel controls */
  var carousel = document.getElementById("testimonialCarousel");
  var prev = document.getElementById("testiPrev");
  var next2 = document.getElementById("testiNext");
  if (carousel && prev && next2) {
    var scrollAmount = function () {
      var card = carousel.querySelector(":scope > *");
      return card ? card.getBoundingClientRect().width + 22 : 320;
    };
    prev.addEventListener("click", function () {
      carousel.scrollBy({ left: -scrollAmount(), behavior: "smooth" });
    });
    next2.addEventListener("click", function () {
      carousel.scrollBy({ left: scrollAmount(), behavior: "smooth" });
    });
  }
})();
