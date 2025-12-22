import { onMounted, onBeforeUnmount } from "vue";

export function useRevealOnScroll() {
  let observer: IntersectionObserver | null = null;

  onMounted(() => {
    observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) e.target.classList.add("is-visible");
        }
      },
      { threshold: 0.12 }
    );

    document.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => {
      observer?.observe(el);
    });
  });

  onBeforeUnmount(() => {
    observer?.disconnect();
    observer = null;
  });
}
