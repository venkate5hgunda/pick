<script lang="ts">
  import { onMount } from 'svelte';
  import { contrastColor, type WheelSlice } from '../../domain/wheel';

  let { slices, rotation = 0 }: { slices: WheelSlice[]; rotation?: number } =
    $props();
  let canvas: HTMLCanvasElement;
  let size = $state(0);

  function draw() {
    if (!canvas || !size || !slices.length) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const dpr = window.devicePixelRatio || 1;
    const pixels = Math.round(size * dpr);
    if (canvas.width !== pixels || canvas.height !== pixels) {
      canvas.width = pixels;
      canvas.height = pixels;
    }
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, size, size);
    context.save();
    context.translate(size / 2, size / 2);
    context.rotate(rotation);
    const radius = size / 2 - 7;
    const total = slices.reduce((sum, slice) => sum + slice.weight, 0);
    let cursor = 0;
    for (const slice of slices) {
      const angle = (Math.PI * 2 * slice.weight) / total;
      const center = cursor + angle / 2;
      context.beginPath();
      context.moveTo(0, 0);
      context.arc(0, 0, radius, cursor, cursor + angle);
      context.closePath();
      context.fillStyle = slice.color;
      context.fill();
      context.strokeStyle = 'rgba(33, 28, 24, .18)';
      context.lineWidth = 1;
      context.stroke();
      context.save();
      context.rotate(center);
      context.fillStyle = contrastColor(slice.color);
      const available = radius * 0.7 * angle;
      const fontSize = Math.max(
        8,
        Math.min(
          18,
          size / 19,
          available / Math.max(3.5, slice.label.length * 0.55),
        ),
      );
      context.font = `800 ${fontSize}px ui-sans-serif, system-ui, sans-serif`;
      context.textAlign = 'right';
      context.textBaseline = 'middle';
      context.fillText(slice.label, radius * 0.88, 0, radius * 0.62);
      context.restore();
      cursor += angle;
    }
    context.restore();
  }

  $effect(() => {
    slices;
    rotation;
    size;
    draw();
  });
  onMount(() => {
    const measure = () => {
      const rect = canvas.getBoundingClientRect();
      size = Math.floor(Math.min(rect.width, rect.height));
    };
    const observer = new ResizeObserver(measure);
    observer.observe(canvas);
    const frame = requestAnimationFrame(measure);
    void document.fonts?.ready.then(measure);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  });
</script>

<canvas bind:this={canvas} aria-hidden="true"></canvas>
