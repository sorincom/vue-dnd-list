import { DnDList, DnDListItem } from './components'

const DnDListPlugin = {
  install(Vue) {
    Vue.component("DnDList", DnDList)
    Vue.component("DnDListItem", DnDListItem)
  }
}

export { DnDListPlugin, DnDList, DnDListItem }