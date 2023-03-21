# [Demo](https://sorincom.github.io/vue-dnd-list-demo)

# Features
 - Drag and drop support inside the list
 - Drag and drop between multiple lists
 - Drag and drop from arbitrary DOM elements to the list
 - Control from which sources a list accepts drop
 - Vertical, horizontal or grid layout
 - Variable item height
 - Custom animations
 - Post-drop altering of dropped data

# Installation

```
npm install vue-dnd-list
```

# Usage

`vue-dnd-list` exports the following:

 - `DnDList`: a Vue list component supporting drag and drop
 - `dnd`: shared state for drag and drop operations exposing 2 props:
   - `source`: a string identifying the source of the data being dragged
   - `data`: the data being dragged
 - `dragsource`: a directive that can be used with other elements in order to make them able to cooperate with `DnDList`
 - `DnDListPlugin`: a plugin that registers globally the `DnDList` component and the `dragsource` directive

__Example__ (please see the [demo](https://sorincom.github.io/vue-dnd-list-demo) for more examples):

```html
<DnDList :items="items" class="list">
  <template v-slot:item="{ item }">
    <div class="list-item" :style="`background: ${item.color};`">
      <span>{{ item.title }}</span>
    </div>
  </template>
</DnDList>
```

```js
import { DnDList } from 'vue-dnd-list'

export default {
  components: { DnDList },
  data() {
    return {
      items: [
        { id: 'id-a0', title: 'Item A-0', color: `hsl(330,90%,90%)` },
        { id: 'id-a1', title: 'Item A-1', color: `hsl(330,90%,88%)` },
        { id: 'id-a2', title: 'Item A-2', color: `hsl(330,90%,86%)` },
      ]
    }
  }
}
```

# DnDList Component

## Props

| Prop | Required | Default Value | Type | Description |
| -----| -------- | ------------- | ---- | ----------- |
| `listId` | false | null | String | List's id. If not provided, a random string will be used. It goes to the `source` member of the shared `dnd` state when a drag operation starts. |
| `items` | true | none | Array | The items source for the list. There's no constraint imposed over the internal structure of an item. When dragging the DOM element of an item, that item goes to the `data` member of the shared `dnd` state. |
| `accept` | false | true | Boolean/String/Array | Controls if and from who does the list accept drops. When boolean, it controls whether to accept drop from any source. When string, it will accept drop from a single source, identified by that string. When array, it will accept drop from sources identified by elements of the array. |
| `copy` | false | false | Boolean | When set, the item will be copied when dragged, instead of being moved. Also, when true, the list will reject any drop, including from itself. |
| `useHandle` | false | false | Boolean | When false, the item itself will be draggable. When true, the item is not draggable. To use a drag handle, the developer must define a draggable element inside the item template; that element must have the `draggable` attribute set to `true`. |
| `postDrop` | false | null | Function | Optional function to be called after an item is dropped. It receives the dropped item as argument and is basically intended as a mean for the consumer to alter the item's data immediately after it's dropped.|
| `animation` | false | Stock animation provided | Object | Optional custom animation for adding and removing items from the list. If not provided, the default animation will be used. It must be an object with the following structure: `{ onEnter: function(el, {onComplete}) { ... }, onLeave: function(el, {onComplete}) { ... }, }` `el` is the DOM element of the item being animated.|
| `useGapOptimization` | false | true | Boolean | When true, the list will react to dragging through the gap between list items too. This feature is quite useless if the list is compact (aka it has no gaps/padding) so, in that case, it's probably best to disable it.|

## Slots

The `DnDList` component provides a slot named `item` (see example above) to allow developers to define the template of an item. The slot provides 2 props, `item` and `index`, which can be used inside the item's template.

## Styling

The `DnDList` container and the item template can be styled freely. In the example above, the classes `list` and `list-item` are to be defined by the developer (chosen class names are for example purposes, there is no constraint imposed on them).

However, there is a special situation, when the items list becomes empty. If this happens, the list container receives a predefined CSS class name, `dragging-over-when-empty`. If you want to control the styling of an empty list, you must provide the CSS code for this class.

Usually, the list would be styled as a `flex` or `grid` container.

# v-dragsource Directive

To allow arbitrary DOM elements to provide data to `DnDList` via drag and drop, you can use the `dragsource` directive.

__Example__:

```html
<template>
  ...
  <article v-dragsource="customItem">
    Drag Me!
  </article>
  ...
</template>
```

```js
import { dragsource } from 'vue-dnd-list'

export default {
  directives: { dragsource },
  data() {
    return {
      ...
      customItem: {
        source: 'my-article',
        data: {
          'title': 'Dragged from outside'
        }
      }
    }
  }
}
```

By using the `v-dragsource` directive, it becomes possible to drop the article in the example above onto a `DnDList` component, which will receive its `customItem`'s `data` property as a new item.

Note the `customItem`'s internal structure is required to have these two fields, `source` and `data`.

Also, keep in mind that the data transferred via drag and drop with the `v-dragsource` directive is always a new copy of the `data` property (like in `JSON.parse(JSON.stringify(data))`).