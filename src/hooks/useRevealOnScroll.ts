import { onMounted, onBeforeUnmount } from "vue";

export function useRevealOnScroll() {
  let observer: IntersectionObserver | null = null;

  function observeAll() {
    if (!observer) return;

    document.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => {
      if (!el.classList.contains("is-visible")) observer!.observe(el);
    });
  }

  onMounted(() => {
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).classList.add("is-visible");
            observer?.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -10% 0px" }
    );

    observeAll();
  });

  onBeforeUnmount(() => {
    observer?.disconnect();
    observer = null;
  });

  return { observeAll };
}
