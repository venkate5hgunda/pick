<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { categories, filterRequirements, requirements } from './lib/catalog';
  let query = $state('');
  let category = $state('All');
  let route = $state('');
  const visible = $derived(filterRequirements(query, category));
  const item = $derived(
    requirements.find((value) => route === `/requirements/${value.id}`),
  );
  onMount(() => {
    const update = async () => {
      route = window.location.hash.slice(1);
      if (route === '' || route === '/') {
        query = '';
        category = 'All';
      }
      await tick();
      document.querySelector<HTMLElement>('h1')?.focus();
      window.scrollTo(0, 0);
    };
    void update();
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  });
</script>

<a
  class="skip"
  href="#main"
  onclick={(event) => {
    event.preventDefault();
    document.getElementById('main')?.focus();
  }}>Skip to content</a
>
<div class="wrap">
  <header>
    <a class="brand" href="#/">Pick<span>✦</span></a><span class="label"
      >Redesign foundation</span
    >
  </header>
  <main id="main" tabindex="-1">
    {#if route === '' || route === '/'}
      <section class="hero">
        <div>
          <div class="eyebrow">A new chapter / 01</div>
          <h1 tabindex="-1">A little chance. A lot of possibility.</h1>
          <p class="lede">
            The next home for wheels, dice and delightful decisions.
          </p>
          <p class="note">
            Foundation preview. Explore the feature plan below; gameplay and
            saved-data migration come in later milestones.
          </p>
        </div>
        <div class="art wheel" aria-hidden="true"></div>
      </section>
      <section aria-labelledby="catalog-title">
        <div class="toolbar">
          <div>
            <div class="eyebrow">The complete picture</div>
            <h2 id="catalog-title">Explore the redesign</h2>
          </div>
          <label class="search"
            >Search features<input
              type="search"
              bind:value={query}
              placeholder="Find a feature…"
            /></label
          >
        </div>
        <div class="filters" aria-label="Feature categories">
          {#each categories as value}<button
              class="filter"
              aria-pressed={category === value}
              onclick={() => (category = value)}>{value}</button
            >{/each}
        </div>
        <p class="count" role="status">
          {visible.length} of {requirements.length} feature groups · all awaiting
          migration
        </p>
        <div class="grid">
          {#each visible as entry}<a
              class="card"
              href={`#/requirements/${entry.id}`}
              ><div class="meta">
                <span>{entry.category}</span><span>Planned</span>
              </div>
              <h3>{entry.title}</h3>
              <p>{entry.acceptance[0]}</p>
              <span class="link-label">View acceptance criteria →</span></a
            >{/each}
        </div>
        {#if !visible.length}<p class="empty">
            No features match. Clear the search or choose another category.
          </p>{/if}
      </section>
    {:else if item}
      <section class="detail">
        <a class="back" href="#/">← All features</a>
        <div class="eyebrow">{item.id} / {item.category} / Planned</div>
        <h1 tabindex="-1">{item.title}</h1>
        <p class="note">
          This is a requirement for the redesign. The migrated feature is not
          implemented in this foundation.
        </p>
        <div class="panel">
          <h2>What must work</h2>
          <ul>
            {#each item.acceptance as text}<li>{text}</li>{/each}
          </ul>
        </div>
        <div class="panel">
          <h2>Baseline evidence</h2>
          <p>Repository paths used to derive this requirement:</p>
          <ul>
            {#each item.sources as path}<li><code>{path}</code></li>{/each}
          </ul>
          <h2>Existing coverage</h2>
          {#if item.baselineTests.length}<ul>
              {#each item.baselineTests as path}<li>
                  <code>{path}</code>
                </li>{/each}
            </ul>{:else}<p>
              No dedicated test mapped yet. Add a complete behavior test before
              parity sign-off.
            </p>{/if}
        </div>
      </section>
    {:else}<section class="detail">
        <h1 tabindex="-1">Feature not found</h1>
        <p>This feature is not in the baseline inventory.</p>
        <a href="#/">Back to all features</a>
      </section>{/if}
  </main>
  <footer>
    <p>Svelte + TypeScript + Vite · Local development preview</p>
    <p>
      Scope: requirements, architecture and runnable foundations. Full feature
      parity is a release gate.
    </p>
  </footer>
</div>
