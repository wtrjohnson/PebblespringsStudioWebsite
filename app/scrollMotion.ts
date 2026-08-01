"use client";

type ScrollAxis = "top" | "left";

type ScrollMotionTarget = Window | HTMLElement;

function easeOutCubic(progress: number) {
  return 1 - Math.pow(1 - progress, 3);
}

function getScrollPosition(target: ScrollMotionTarget, axis: ScrollAxis) {
  if (target instanceof Window) {
    return axis === "top" ? target.scrollY : target.scrollX;
  }

  return axis === "top" ? target.scrollTop : target.scrollLeft;
}

function setScrollPosition(target: ScrollMotionTarget, axis: ScrollAxis, value: number) {
  if (target instanceof Window) {
    target.scrollTo({
      top: axis === "top" ? value : target.scrollY,
      left: axis === "left" ? value : target.scrollX,
      behavior: "instant",
    });
    return;
  }

  if (axis === "top") {
    target.scrollTop = value;
  } else {
    target.scrollLeft = value;
  }
}

export function animateScroll({
  target,
  axis,
  to,
  duration = 720,
}: {
  target: ScrollMotionTarget;
  axis: ScrollAxis;
  to: number;
  duration?: number;
}) {
  const from = getScrollPosition(target, axis);
  const previousScrollBehavior = document.documentElement.style.scrollBehavior;
  let frameId = 0;
  let startTime = 0;

  document.documentElement.style.scrollBehavior = "auto";

  const cancel = () => {
    window.cancelAnimationFrame(frameId);
    document.documentElement.style.scrollBehavior = previousScrollBehavior;
  };

  const tick = (timestamp: number) => {
    if (!startTime) {
      startTime = timestamp;
    }

    const progress = Math.min((timestamp - startTime) / duration, 1);
    const eased = easeOutCubic(progress);
    setScrollPosition(target, axis, from + (to - from) * eased);

    if (progress < 1) {
      frameId = window.requestAnimationFrame(tick);
    } else {
      document.documentElement.style.scrollBehavior = previousScrollBehavior;
    }
  };

  frameId = window.requestAnimationFrame(tick);

  return cancel;
}
