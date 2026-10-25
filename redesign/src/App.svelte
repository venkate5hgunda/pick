<script lang="ts">
  import { onMount, tick } from 'svelte';
  import Icon from '@iconify/svelte';
  import chartBar from '@iconify-icons/mdi/chart-bar';
  import chevronDown from '@iconify-icons/mdi/chevron-down';
  import close from '@iconify-icons/mdi/close';
  import cogOutline from '@iconify-icons/mdi/cog-outline';
  import deleteOutline from '@iconify-icons/mdi/delete-outline';
  import diceMultiple from '@iconify-icons/mdi/dice-multiple';
  import plus from '@iconify-icons/mdi/plus';
  import refresh from '@iconify-icons/mdi/refresh';
  import weatherSunny from '@iconify-icons/mdi/weather-sunny';
  import {
    PALETTE,
    PRESETS,
    committedWeight,
    expandInputSets,
    makeOptions,
    presetKeyFor,
    weightedIndex,
    type WheelOption,
  } from './domain/wheel';
  import WheelCanvas from './features/wheel/WheelCanvas.svelte';
  import { categories, filterRequirements, requirements } from './lib/catalog';

  const STORAGE_KEY = 'pick:redesign:wheel-v1';
  const TAU = Math.PI * 2;
  let route = $state('');
  let query = $state('');
  let category = $state('All');
  let options = $state<WheelOption[]>(makeOptions(PRESETS.yesno.options));
  let inputSets = $state(PRESETS.yesno.inputSets);
  let weightsEnabled = $state(false);
  let rotation = $state(0);
  let spinning = $state(false);
  let selected = $state<WheelOption | null>(null);
  let storageMessage = $state('');
  let darkPreview = $state(false);
  let resultDialog: HTMLDialogElement;
  let animationFrame: number | null = null;
  let persistReady = false;

  const slices = $derived(expandInputSets(options, inputSets, weightsEnabled));
  const presetKey = $derived(presetKeyFor(options, inputSets, weightsEnabled));
  const visible = $derived(filterRequirements(query, category));
  const requirement = $derived(
    requirements.find((value) => route === `/requirements/${value.id}`),
  );

  function loadWheel() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored) as {
        options?: WheelOption[];
        inputSets?: number;
        weightsEnabled?: boolean;
      };
      if (Array.isArray(parsed.options) && parsed.options.length >= 2) {
        options = parsed.options.map((option, index) => ({
          id: typeof option.id === 'string' ? option.id : crypto.randomUUID(),
          label: String(option.label || `Option ${index + 1}`),
          color: /^#[0-9a-f]{6}$/i.test(option.color)
            ? option.color
            : PALETTE[index % PALETTE.length],
          weight: committedWeight(option.weight),
        }));
        inputSets = Math.min(5, Math.max(1, Number(parsed.inputSets) || 1));
        weightsEnabled = Boolean(parsed.weightsEnabled);
      }
    } catch {
      storageMessage =
        'Saved setup could not be read. Your wheel still works in this tab.';
    }
  }

  function persistWheel() {
    if (!persistReady) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ options, inputSets, weightsEnabled }),
      );
      storageMessage = '';
    } catch {
      storageMessage =
        'Changes are kept for now, but this browser could not save them.';
    }
  }

  $effect(() => {
    options;
    inputSets;
    weightsEnabled;
    persistWheel();
  });

  onMount(() => {
    loadWheel();
    persistReady = true;
    const updateRoute = async () => {
      route = window.location.hash.slice(1);
      await tick();
      document.querySelector<HTMLElement>('h1')?.focus();
      window.scrollTo(0, 0);
    };
    void updateRoute();
    window.addEventListener('hashchange', updateRoute);
    return () => {
      window.removeEventListener('hashchange', updateRoute);
      if (animationFrame !== null) cancelAnimationFrame(animationFrame);
    };
  });

  function selectPreset(key: string) {
    const preset = PRESETS[key];
    if (!preset || spinning) return;
    options = makeOptions(preset.options);
    inputSets = preset.inputSets;
    weightsEnabled = false;
    rotation = 0;
  }

  function addOption() {
    if (spinning || options.length >= 12) return;
    options = [
      ...options,
      {
        id: crypto.randomUUID(),
        label: `Option ${options.length + 1}`,
        color: PALETTE[options.length % PALETTE.length],
        weight: 1,
      },
    ];
  }

  function updateOption(id: string, patch: Partial<WheelOption>) {
    options = options.map((option) =>
      option.id === id ? { ...option, ...patch } : option,
    );
  }

  function removeOption(id: string) {
    if (spinning || options.length <= 2) return;
    options = options.filter((option) => option.id !== id);
  }

  function spin() {
    if (spinning || options.length < 2) return;
    selected = null;
    spinning = true;
    const sourceIndex = weightedIndex(options, weightsEnabled);
    const matchingSlices = slices
      .map((slice, index) => ({ slice, index }))
      .filter(({ slice }) => slice.sourceIndex === sourceIndex);
    const target =
      matchingSlices[Math.floor(Math.random() * matchingSlices.length)].index;
    const totalWeight = slices.reduce((sum, slice) => sum + slice.weight, 0);
    const beforeWeight = slices
      .slice(0, target)
      .reduce((sum, slice) => sum + slice.weight, 0);
    const center =
      (TAU * (beforeWeight + slices[target].weight / 2)) / totalWeight;
    const normalizedDelta =
      (((-Math.PI / 2 - center - rotation) % TAU) + TAU) % TAU;
    const startRotation = rotation;
    const endRotation = rotation + TAU * 6 + normalizedDelta;
    const reducedMotion = matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    const duration = reducedMotion ? 450 : 7000;
    const startedAt = performance.now();
    const frame = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 5);
      rotation = startRotation + (endRotation - startRotation) * eased;
      if (progress < 1) {
        animationFrame = requestAnimationFrame(frame);
        return;
      }
      animationFrame = null;
      rotation = endRotation % TAU;
      selected = options[sourceIndex];
      spinning = false;
      resultDialog.showModal();
    };
    animationFrame = requestAnimationFrame(frame);
  }

  function closeResult() {
    resultDialog.close();
  }
  function spinAgain() {
    closeResult();
    spin();
  }
</script>

<a class="skip" href="#main">Skip to content</a>
<div class:dark-preview={darkPreview} class="app-shell">
  <header class="site-header">
    <a class="brand" href="#/" aria-label="Pick home">Pick<span>✦</span></a>
    <nav aria-label="Primary navigation">
      <a class:active={route === '' || route === '/'} href="#/">Play</a>
      <a class:active={route === '/roadmap'} href="#/roadmap">Roadmap</a>
    </nav>
    <button
      class="icon-button"
      type="button"
      aria-label="Theme preview"
      title="Theme preview"
      aria-pressed={darkPreview}
      onclick={() => (darkPreview = !darkPreview)}
    >
      <Icon icon={weatherSunny} width="21" />
    </button>
  </header>

  <main id="main" tabindex="-1">
    {#if route === '' || route === '/'}
      <h1 class="sr-only" tabindex="-1">Pick decision wheel</h1>
      <div class="product-tabs" aria-label="Pick tools">
        <button class="product-tab active" type="button" aria-current="page">
          <span class="tab-icon wheel-mark" aria-hidden="true"></span>
          <span><strong>Wheel</strong><small>Make a decision</small></span>
        </button>
        <a class="product-tab" href="#/roadmap">
          <Icon icon={diceMultiple} width="25" />
          <span><strong>Dice</strong><small>Coming next</small></span>
        </a>
        <a class="product-tab compact" href="#/roadmap">
          <Icon icon={chartBar} width="23" />
          <span><strong>Stats</strong><small>Planned</small></span>
        </a>
      </div>

      {#if storageMessage}<p class="storage-message" role="status">
          {storageMessage}
        </p>{/if}

      <section class="wheel-workspace" aria-label="Decision wheel">
        <div class="wheel-column">
          <div class="wheel-heading">
            <div>
              <p class="eyebrow">Your decision, center stage</p>
              <h2>Give it a spin.</h2>
            </div>
            <p>{slices.length} slices · {options.length} outcomes</p>
          </div>
          <div class:spinning class="wheel-stage">
            <div class="pointer" aria-hidden="true"></div>
            <WheelCanvas {slices} {rotation} />
            <button
              class="spin-center"
              type="button"
              onclick={spin}
              disabled={spinning}
              aria-label={spinning ? 'Wheel is spinning' : 'Spin the wheel'}
            >
              <span>{spinning ? '…' : 'Spin'}</span>
            </button>
          </div>
          <button
            class="primary-spin"
            type="button"
            onclick={spin}
            disabled={spinning}
          >
            {spinning ? 'Choosing…' : 'Spin the wheel'}
          </button>
          <p class="spin-note" aria-live="polite">
            {spinning
              ? 'The outcome is locked. The wheel is revealing it now.'
              : 'Tap the center or use the button. Your result is chosen fairly before the animation begins.'}
          </p>
        </div>

        <aside class="control-panel" aria-labelledby="options-title">
          <div class="panel-heading">
            <div>
              <p class="eyebrow">Make it yours</p>
              <h2 id="options-title">Wheel options</h2>
            </div>
            <span class="saved-state">Saved locally</span>
          </div>

          <label class="field-label" for="preset">Start with a preset</label>
          <div class="select-wrap">
            <select
              id="preset"
              value={presetKey}
              onchange={(event) => selectPreset(event.currentTarget.value)}
              disabled={spinning}
            >
              <option value="">Select</option>
              {#each Object.entries(PRESETS) as [key, preset]}<option
                  value={key}>{preset.label}</option
                >{/each}
            </select>
            <Icon icon={chevronDown} width="20" aria-hidden="true" />
          </div>

          <div class="option-labels" aria-hidden="true">
            <span>Color</span><span>Option</span>{#if weightsEnabled}<span
                >Weight</span
              >{/if}<span></span>
          </div>
          <div class="option-list">
            {#each options as option, index (option.id)}
              <div class:with-weights={weightsEnabled} class="option-row">
                <label class="color-control" style={`--swatch:${option.color}`}>
                  <span class="sr-only">Color for {option.label}</span>
                  <input
                    type="color"
                    value={option.color}
                    disabled={spinning}
                    oninput={(event) =>
                      updateOption(option.id, {
                        color: event.currentTarget.value,
                      })}
                  />
                </label>
                <label
                  ><span class="sr-only">Option {index + 1}</span>
                  <input
                    type="text"
                    value={option.label}
                    maxlength="32"
                    disabled={spinning}
                    oninput={(event) =>
                      updateOption(option.id, {
                        label: event.currentTarget.value || '—',
                      })}
                  />
                </label>
                {#if weightsEnabled}
                  <label
                    ><span class="sr-only">Weight for {option.label}</span>
                    <input
                      class="weight-input"
                      type="number"
                      inputmode="numeric"
                      min="1"
                      step="1"
                      value={option.weight}
                      disabled={spinning}
                      onblur={(event) => {
                        const weight = committedWeight(
                          event.currentTarget.value,
                        );
                        event.currentTarget.value = String(weight);
                        updateOption(option.id, { weight });
                      }}
                    />
                  </label>
                {/if}
                <button
                  class="row-action"
                  type="button"
                  onclick={() => removeOption(option.id)}
                  disabled={spinning || options.length <= 2}
                  aria-label={`Remove ${option.label}`}
                  title="Remove option"
                >
                  <Icon icon={deleteOutline} width="20" />
                </button>
              </div>
            {/each}
          </div>

          <button
            class="add-button"
            type="button"
            onclick={addOption}
            disabled={spinning || options.length >= 12}
          >
            <Icon icon={plus} width="20" /> Add option
          </button>

          <details class="settings-card">
            <summary
              ><span><Icon icon={cogOutline} width="20" /> More settings</span
              ><Icon icon={chevronDown} width="20" /></summary
            >
            <div class="settings-body">
              <label class="setting-row">
                <span
                  ><strong>Weighted outcomes</strong><small
                    >Give some options a better chance.</small
                  ></span
                >
                <input
                  type="checkbox"
                  role="switch"
                  bind:checked={weightsEnabled}
                  disabled={spinning}
                />
              </label>
              <label class="setting-row input-set-row">
                <span
                  ><strong>Visual repeats</strong><small
                    >More slices, same odds.</small
                  ></span
                >
                <select
                  bind:value={inputSets}
                  disabled={spinning}
                  aria-label="Visual repeats"
                >
                  {#each [1, 2, 3, 4, 5] as count}<option value={count}
                      >{count}</option
                    >{/each}
                </select>
              </label>
            </div>
          </details>
        </aside>
      </section>
    {:else if route === '/roadmap'}
      <section class="roadmap">
        <p class="eyebrow">Migration map</p>
        <h1 tabindex="-1">A playful Pick, rebuilt piece by piece.</h1>
        <p class="roadmap-lede">
          The wheel is now interactive. Every remaining capability stays visible
          here until it earns verified parity.
        </p>
        <div class="roadmap-toolbar">
          <label
            >Search features<input
              type="search"
              bind:value={query}
              placeholder="Find a feature…"
            /></label
          >
          <div class="filters" aria-label="Feature categories">
            {#each categories as value}<button
                class="filter"
                aria-pressed={category === value}
                onclick={() => (category = value)}>{value}</button
              >{/each}
          </div>
        </div>
        <p class="count" role="status">
          {visible.length} of {requirements.length} feature groups
        </p>
        <div class="grid">
          {#each visible as entry}<a
              class="card"
              href={`#/requirements/${entry.id}`}
            >
              <div class="meta">
                <span>{entry.category}</span><span>{entry.status}</span>
              </div>
              <h2>{entry.title}</h2>
              <p>{entry.acceptance[0]}</p>
              <span class="link-label">View acceptance criteria →</span>
            </a>{/each}
        </div>
        {#if !visible.length}<p class="empty">
            No features match. Clear the search or choose another category.
          </p>{/if}
      </section>
    {:else if requirement}
      <section class="detail">
        <a class="back" href="#/roadmap">← All features</a>
        <p class="eyebrow">
          {requirement.id} / {requirement.category} / {requirement.status}
        </p>
        <h1 tabindex="-1">{requirement.title}</h1>
        <div class="panel">
          <h2>What must work</h2>
          <ul>
            {#each requirement.acceptance as text}<li>{text}</li>{/each}
          </ul>
        </div>
        <div class="panel">
          <h2>Baseline evidence</h2>
          <ul>
            {#each requirement.sources as path}<li>
                <code>{path}</code>
              </li>{/each}
          </ul>
        </div>
      </section>
    {:else}
      <section class="detail">
        <h1 tabindex="-1">Page not found</h1>
        <p>This route is not part of Pick yet.</p>
        <a href="#/">Back to the wheel</a>
      </section>
    {/if}
  </main>

  <footer>
    <span>Pick is private by design. Your choices stay on this device.</span><a
      href="#/roadmap">See the redesign roadmap</a
    >
  </footer>
</div>

<dialog
  class="result-dialog"
  bind:this={resultDialog}
  onclose={() => (selected = null)}
>
  {#if selected}
    <button
      class="dialog-close"
      type="button"
      onclick={closeResult}
      aria-label="Close result"><Icon icon={close} width="22" /></button
    >
    <p class="eyebrow">The wheel has spoken</p>
    <div
      class="result-swatch"
      style={`--result:${selected.color}`}
      aria-hidden="true"
    ></div>
    <h2>{selected.label}</h2>
    <p>Your answer landed fair and square.</p>
    <div class="dialog-actions">
      <button class="dialog-secondary" type="button" onclick={closeResult}
        >Done</button
      >
      <button class="dialog-primary" type="button" onclick={spinAgain}
        ><Icon icon={refresh} width="19" /> Spin again</button
      >
    </div>
  {/if}
</dialog>
