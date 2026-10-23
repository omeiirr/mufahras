<script lang="ts">
  import type { GradeClass } from '../lib/hadith/grades';
  import { GRADE_LABEL } from '../lib/ui/format';

  let { grade, label }: { grade: GradeClass; label?: string } = $props();
</script>

<span class="badge {grade}">{label ?? GRADE_LABEL[grade]}</span>

<style>
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: var(--text-xs);
    font-weight: 600;
    line-height: 1;
    padding: 4px 8px;
    border-radius: 99px;
    border: 1px solid currentColor;
    text-align: left;
  }
  .badge::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
  }
  .sahih {
    color: var(--sahih);
  }
  .hasan {
    color: var(--hasan);
  }
  .daif,
  .mawdu {
    color: var(--daif);
  }
  .other {
    color: var(--other);
  }
</style>
