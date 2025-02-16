<script setup lang="ts">
import { useGlobalStore } from '../../../stores'
import type { Variable } from '../../../types'

defineProps<{ value?: Variable[] }>()

const { server, setServer } = useGlobalStore()

const handleInput = (name: string, event: Event) => {
  const newValue = (event.target as HTMLSelectElement).value
  const newVariables = [...server.variables]
  const index = newVariables.findIndex((variable) => variable.name === name)

  newVariables[index].value = newValue

  setServer({
    variables: newVariables,
  })
}

const getValue = (name: string) => {
  const index = server.variables.findIndex((variable) => variable.name === name)

  return server.variables[index].value ?? ''
}
</script>
<template>
  <div v-if="value">
    <div
      v-for="variable in value"
      :key="variable.name"
      class="input">
      <label :for="`variable-${variable.name}`">
        <code>{{ variable.name }}</code>
      </label>

      <template v-if="variable.enum">
        <select
          :id="`variable-${variable.name}`"
          :value="getValue(variable.name)"
          @input="(event) => handleInput(variable.name, event)">
          <option
            v-for="enumValue in variable.enum"
            :key="enumValue"
            :value="enumValue">
            {{ enumValue }}
          </option>
        </select>
        <div class="input-value">
          {{ variable.default }}
        </div>
      </template>
      <template v-else>
        <input
          :id="`variable-${variable.name}`"
          autocomplete="off"
          placeholder="value"
          spellcheck="false"
          type="text"
          :value="getValue(variable.name)"
          @input="(event) => handleInput(variable.name, event)" />
      </template>
    </div>
  </div>
</template>

<style scoped>
.input select {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  opacity: 0;
}

.input-value {
  color: var(--theme-color-1, var(--default-theme-color-1));
  font-size: var(--theme-micro, var(--default-theme-micro));
  padding: 9px;
}

.variable-description {
  padding: 6px 12px;
  font-size: var(--theme-small, var(--default-theme-small));
}
.variable-description :deep(.markdown) {
  font-size: var(--theme-micro, var(--default-theme-micro));
  font-weight: var(--theme-semibold, var(--default-theme-semibold));
  color: var(--theme-color--1, var(--default-theme-color-1));
  padding: 4px 0;
  display: block;
}
.variable-description :deep(.markdown > *:first-child) {
  margin-top: 0;
}
.input {
  align-items: center;
}
.input:first-of-type {
  border-radius: 0;
  border-top: 1px solid
    var(--theme-border-color, var(--default-theme-border-color));
}
</style>
