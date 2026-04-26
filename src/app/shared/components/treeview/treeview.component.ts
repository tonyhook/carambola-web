import { Component, effect, ElementRef, input, OnInit, output, signal, untracked, viewChild, WritableSignal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTree, MatTreeModule, MatTreeNestedDataSource } from '@angular/material/tree';
import { Observable } from 'rxjs';

import { HierarchyManagedResource } from '../../../core';

/** Item change event */
export class ItemChangeEvent {
  id = 0;
  type = '';
  oldValue: number | null = null;
  newValue: number | null = null;
}

/** Item select event */
export class ItemSelectEvent {
  id = 0;
}

/** New item event */
export class ItemNewEvent {
  name = '';
  parentId: number | null = null;
  sequence = 0;
}

/** Delete item event */
export class ItemDeleteEvent {
  id = 0;
}

/**
 * Node for hierarchy item
 */
export class HierarchyNode {
  id = 0;
  name = '';
  sequence = 0;
  parent: HierarchyNode | null = null;
  children: HierarchyNode[] = [];

  expandable = false;
}

@Component({
  selector: 'carambola-tree-view',
  imports: [
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatTreeModule,
  ],
  templateUrl: './treeview.component.html',
  styleUrls: ['./treeview.component.scss'],
})
export class TreeViewComponent implements OnInit {
  dataSource: MatTreeNestedDataSource<HierarchyNode> = new MatTreeNestedDataSource<HierarchyNode>();
  childrenAccessor = (node: HierarchyNode) => node.children ?? [];
  trackBy = (_: number, node: HierarchyNode) => node.id;
  hasNoContent = (_: number, node: HierarchyNode): boolean => node.name === '';

  nodes: WritableSignal<HierarchyNode[]> = signal([]);
  observableNodes: Observable<HierarchyNode[]> = toObservable(this.nodes);

  nodeMap = signal(new Map<number, HierarchyNode>());
  newNode = signal<HierarchyNode | null>(null);
  selectedNode = signal<HierarchyNode | null>(null);
  dragNode = signal<HierarchyNode | null>(null);
  dragNodeExpandOverWaitTimeMs = 500;
  dragNodeExpandOverNode = signal<HierarchyNode | null>(null);
  dragNodeExpandOverTime = signal(0);
  dragNodeExpandOverArea = signal('center');

  items = input<HierarchyManagedResource[]>([]);
  item = input<HierarchyManagedResource | null>(null);
  readOnly = input(false);
  itemChange = output<ItemChangeEvent>();
  itemSelect = output<ItemSelectEvent>();
  itemCreate = output<ItemNewEvent>();
  itemDelete = output<ItemDeleteEvent>();

  readonly tree = viewChild<MatTree<HierarchyNode>>('tree');
  readonly emptyNode = viewChild<ElementRef>('emptyNode');

  constructor() {
    effect(() => {
      const items = this.items();

      const tree: HierarchyNode[] = [];
      const idMapping = items.reduce((acc: number[], el, i) => {
        if (el.id !== null) {
          acc[el.id] = i;
        }
        return acc;
      }, []);

      const hierarchyNodes = items.reduce((acc: HierarchyNode[], el, i) => {
        const item: HierarchyNode = {
          id: el.id ? el.id : 0,
          name: el.name,
          parent: null,
          sequence: el.sequence ? el.sequence : 0,
          children: [],
          expandable: false,
        }
        acc[i] = item;
        return acc;
      }, []);

      items.forEach((el, i) => {
        if ((el.parentId === null) || (idMapping[el.parentId] === null)) {
          tree.push(hierarchyNodes[i]);
          tree.sort(function(a, b) {return a.sequence - b.sequence});
        } else {
          const parentEl = hierarchyNodes[idMapping[el.parentId]];
          parentEl.children = [...(parentEl.children || []), hierarchyNodes[i]];
          parentEl.children.sort(function(a, b) {return a.sequence - b.sequence});
          parentEl.expandable = true;
          hierarchyNodes[i].parent = parentEl;
        }
      });

      this.refreshNodes(tree);

      const selectedNode = untracked(() => this.selectedNode());
      if (selectedNode) {
        const refreshedSelectedNode = untracked(() => this.nodeMap().get(selectedNode.id)) ?? null;
        if (refreshedSelectedNode) {
          this.selectNode(refreshedSelectedNode, false);
        }
      }
    });

    effect(() => {
      const item = this.item();
      if (item !== null && item.id) {
        const node = this.nodeMap().get(item.id);
        if (node) {
          this.selectNode(node, false);
        }
      }
    });
  }

  ngOnInit() {
    this.dataSource.connect = () => {
      return this.observableNodes;
    };
  }

  refreshNodes(nodes: HierarchyNode[]) {
    nodes = structuredClone(nodes);
    this.nodes.set(nodes);

    const map = new Map<number, HierarchyNode>();

    const collect = (node: HierarchyNode, map: Map<number, HierarchyNode>) => {
      map.set(node.id, node);
      if (node.children) {
        node.children.forEach((child) => {
          collect(child, map);
        });
      }
    };

    nodes.forEach((node) => {
      collect(node, map);
    });

    this.nodeMap.set(map);
  }

  selectNode(node: HierarchyNode, emitEvent: boolean) {
    const newNode = this.newNode();
    if (newNode && newNode.parent?.id !== node.id) {
      this.cancelNode(null, newNode);
    }

    this.selectedNode.set(node);

    if (emitEvent) {
      this.itemSelect.emit({
        id: node.id
      });
    }

    // TODO: expand node directly after mat-tree bug #30403 is fixed
    if (node.parent) {
      let parent: HierarchyNode | undefined | null = this.nodeMap().get(node.parent.id);
      while (parent) {
        this.tree()?.expand(parent);
        parent = parent.parent;
      }
    }

    this.tree()?.expand(node);
  }

  addNode(event: MouseEvent, parentNode: HierarchyNode | null) {
    event.stopPropagation();

    const currentNewNode = this.newNode();
    if (currentNewNode) {
      this.cancelNode(null, currentNewNode, false);
    }

    const items = this.items();
    const maxId = items.length > 0 ? Math.max(...items.map(item => item.id!)) : 0;

    if (parentNode) {
      const newItem: HierarchyNode = {
        id: maxId + 1,
        name: '',
        sequence: parentNode.children.length,
        parent: parentNode,
        children: [],
        expandable: false,
      };
      parentNode.children.push(newItem);
      this.refreshNodes(this.nodes());
      this.newNode.set(this.nodeMap().get(maxId + 1) ?? null);
      this.selectedNode.set(null);

      // TODO: expand node directly after mat-tree bug #30403 is fixed
      let parent: HierarchyNode | undefined | null = this.nodeMap().get(parentNode.id);
      while (parent) {
        this.tree()?.expand(parent);
        parent = parent.parent;
      }
    } else {
      const newItem: HierarchyNode = {
        id: maxId + 1,
        name: '',
        sequence: this.nodes().length,
        parent: null,
        children: [],
        expandable: false,
      };
      this.refreshNodes([...this.nodes(), newItem]);
      this.newNode.set(this.nodeMap().get(maxId + 1) ?? null);
      this.selectedNode.set(null);
    }
  }

  saveNode(event: MouseEvent, node: HierarchyNode, itemValue: string) {
    event.stopPropagation();

    this.newNode.set(null);
    this.itemCreate.emit({
      name: itemValue,
      parentId: node.parent ? node.parent.id : null,
      sequence: node.sequence
    });

    // TODO: expand node directly after mat-tree bug #30403 is fixed
    if (node.parent) {
      let parent: HierarchyNode | undefined | null = this.nodeMap().get(node.parent.id);
      while (parent) {
        this.tree()?.expand(parent);
        parent = parent.parent;
      }
    }
  }

  cancelNode(event: MouseEvent | null, node: HierarchyNode, refresh = true) {
    if (event) {
      event.stopPropagation();
    }

    if (node.parent) {
      node.parent.children = node.parent.children.filter(child => child.id !== node.id);
      if (refresh) {
        this.refreshNodes(this.nodes());
      }
      this.newNode.set(null);
    } else {
      if (refresh) {
        this.refreshNodes(this.nodes().filter(item => item.id !== node.id));
      }
      this.newNode.set(null);
    }

    // TODO: expand node directly after mat-tree bug #30403 is fixed
    if (node.parent) {
      let parent: HierarchyNode | undefined | null = this.nodeMap().get(node.parent.id);
      while (parent) {
        this.tree()?.expand(parent);
        parent = parent.parent;
      }
    }
  }

  removeNode(event: MouseEvent, node: HierarchyNode) {
    event.stopPropagation();

    for (const child of node.children) {
      child.parent = node.parent;

      this.itemChange.emit({
        id: child.id,
        type: 'parent',
        oldValue: node.id,
        newValue: node.parent ? node.parent.id : null,
      });
    }
    if (node.parent) {
      node.parent.children = [...node.parent.children, ...node.children];
      this.refreshNodes(this.nodes());
      this.selectedNode.set(node.parent);
    } else {

      this.refreshNodes([...this.nodes().filter(item => item.id !== node.id), ...node.children]);
      this.selectedNode.set(null);
    }
    this.newNode.set(null);
    this.itemDelete.emit({id: node.id});

    // TODO: expand node directly after mat-tree bug #30403 is fixed
    if (node.parent) {
      let parent: HierarchyNode | undefined | null = this.nodeMap().get(node.parent.id);
      while (parent) {
        this.tree()?.expand(parent);
        parent = parent.parent;
      }
    }
  }

  handleDragStart(event: DragEvent, node: HierarchyNode) {
    if (event.dataTransfer) {
      // Required by Firefox (https://stackoverflow.com/questions/19055264/why-doesnt-html5-drag-and-drop-work-in-firefox)
      event.dataTransfer.setData('foo', 'bar');

      event.dataTransfer.setDragImage((event.target as HTMLElement), 0, 0);
      event.dataTransfer.effectAllowed = 'move';
    }

    this.dragNode.set(node);
    this.dragNodeExpandOverNode.set(null);
    this.dragNodeExpandOverTime.set(0);
    this.tree()?.collapse(node);
  }

  handleDragEnd() {
    this.dragNode.set(null);
    this.dragNodeExpandOverNode.set(null);
    this.dragNodeExpandOverTime.set(0);
  }

  handleDragOver(event: DragEvent, node: HierarchyNode) {
    event.preventDefault();

    const percentageY = event.offsetY / (event.target as Element).clientHeight;
    const dragNode = this.dragNode();
    const dragNodeExpandOverNode = this.dragNodeExpandOverNode();
    const dragNodeExpandOverTime = this.dragNodeExpandOverTime();

    // Handle node expand
    if (dragNode !== node) {
      if (node === dragNodeExpandOverNode) {
        if ((percentageY < 0.33) || (percentageY > 0.67)) {
          this.dragNodeExpandOverTime.set(0);
        } else {
          let nextDragNodeExpandOverTime = dragNodeExpandOverTime;
          if (dragNodeExpandOverTime === 0) {
            nextDragNodeExpandOverTime = new Date().getTime();
            this.dragNodeExpandOverTime.set(nextDragNodeExpandOverTime);
          }
          if (((new Date().getTime() - nextDragNodeExpandOverTime) > this.dragNodeExpandOverWaitTimeMs)) {
            const tree = this.tree();
            if (!tree?.isExpanded(node)) {
              tree?.expand(node);
            }
          }
        }
      } else {
        const tree = this.tree();
        if (tree?.isExpanded(node)) {
          tree?.collapse(node);
        }

        this.dragNodeExpandOverNode.set(node);
        if ((percentageY < 0.33) || (percentageY > 0.67)) {
          this.dragNodeExpandOverTime.set(0);
        } else {
          this.dragNodeExpandOverTime.set(new Date().getTime());
        }
      }
    } else {
      this.dragNodeExpandOverNode.set(null);
      this.dragNodeExpandOverTime.set(0);
      this.tree()?.collapse(node);
    }

    // Handle drag area
    if (percentageY < 0.33) {
      this.dragNodeExpandOverArea.set('above');
    } else if (percentageY > 0.67) {
      this.dragNodeExpandOverArea.set('below');
    } else {
      this.dragNodeExpandOverArea.set('center');
    }
  }

  handleDrop(event: DragEvent, node: HierarchyNode) {
    event.preventDefault();

    const dragNode = this.dragNode();
    if (node !== dragNode && dragNode) {
      const dragNodeHierarchy = dragNode;
      const nodeHierarchy = node;
      const dragNodeExpandOverArea = this.dragNodeExpandOverArea();

      if (typeof dragNodeHierarchy !== 'undefined' && typeof nodeHierarchy !== 'undefined') {
        if (dragNodeExpandOverArea === 'above') {
          this.moveItemAbove(dragNodeHierarchy, nodeHierarchy);
        } else if (dragNodeExpandOverArea === 'below') {
          this.moveItemBelow(dragNodeHierarchy, nodeHierarchy);
        } else if (dragNodeExpandOverArea === 'center') {
          this.moveItemUnder(dragNodeHierarchy, nodeHierarchy);
        }
      }
    }
    this.dragNode.set(null);
    this.dragNodeExpandOverNode.set(null);
    this.dragNodeExpandOverTime.set(0);
  }

  moveItemUnder(node: HierarchyNode, to: HierarchyNode) {
    const nodes = this.nodes();

    let parentNodeBefore: HierarchyNode | null = null;
    let parentNodeAfter: HierarchyNode | null = null;

    //remove from from.parent.children
    if (node.parent) {
      node.parent.children.splice(node.parent.children.findIndex(item => item.id === node.id), 1);
      parentNodeBefore = node.parent;
    } else {
      nodes.splice(nodes.findIndex(item => item.id === node.id), 1);
      parentNodeBefore = null;
    }

    // insert to to.parent.children
    to.children.push(node);
    parentNodeAfter = to;

    if (parentNodeBefore !== parentNodeAfter) {
      this.itemChange.emit({
        id: node.id,
        type: 'parent',
        oldValue: node.parent ? node.parent.id : null,
        newValue: to.id,
      });
      node.parent = to;
    }

    if (parentNodeBefore) {
      this.updateSequence(parentNodeBefore.children);
    } else {
      this.updateSequence(nodes);
    }
    if (parentNodeAfter) {
      this.updateSequence(parentNodeAfter.children);
    } else {
      this.updateSequence(nodes);
    }

    this.refreshNodes(nodes);

    // TODO: expand node directly after mat-tree bug #30403 is fixed
    if (node.parent) {
      let parent: HierarchyNode | undefined | null = this.nodeMap().get(node.parent.id);
      while (parent) {
        this.tree()?.expand(parent);
        parent = parent.parent;
      }
    }
  }

  moveItemAbove(node: HierarchyNode, to: HierarchyNode) {
    const nodes = this.nodes();

    let parentNodeBefore: HierarchyNode | null = null;
    let parentNodeAfter: HierarchyNode | null = null;

    //remove from from.parent.children
    if (node.parent) {
      node.parent.children.splice(node.parent.children.findIndex(item => item.id === node.id), 1);
      parentNodeBefore = node.parent;
    } else {
      nodes.splice(nodes.findIndex(item => item.id === node.id), 1);
      parentNodeBefore = null;
    }

    // insert to to.parent.children
    if (to.parent) {
      to.parent.children.splice(to.parent.children.findIndex(item => item.id === to.id), 0, node);
      parentNodeAfter = to.parent;
    } else {
      nodes.splice(nodes.findIndex(item => item.id === to.id), 0, node);
      parentNodeAfter = null;
    }

    if (parentNodeBefore !== parentNodeAfter) {
      this.itemChange.emit({
        id: node.id,
        type: 'parent',
        oldValue: node.parent ? node.parent.id : null,
        newValue: to.parent ? to.parent.id : null,
      });
      node.parent = to.parent;
    }

    if (parentNodeBefore) {
      this.updateSequence(parentNodeBefore.children);
    } else {
      this.updateSequence(nodes);
    }
    if (parentNodeAfter) {
      this.updateSequence(parentNodeAfter.children);
    } else {
      this.updateSequence(nodes);
    }

    this.refreshNodes(nodes);

    // TODO: expand node directly after mat-tree bug #30403 is fixed
    if (node.parent) {
      let parent: HierarchyNode | undefined | null = this.nodeMap().get(node.parent.id);
      while (parent) {
        this.tree()?.expand(parent);
        parent = parent.parent;
      }
    }
  }

  moveItemBelow(node: HierarchyNode, to: HierarchyNode) {
    const nodes = this.nodes();

    let parentNodeBefore: HierarchyNode | null = null;
    let parentNodeAfter: HierarchyNode | null = null;

    //remove from from.parent.children
    if (node.parent) {
      node.parent.children.splice(node.parent.children.findIndex(item => item.id === node.id), 1);
      parentNodeBefore = node.parent;
    } else {
      nodes.splice(nodes.findIndex(item => item.id === node.id), 1);
      parentNodeBefore = null;
    }

    // insert to to.parent.children
    if (to.parent) {
      if (to.parent.children.findIndex(item => item.id === to.id) === to.parent.children.length - 1) {
        to.parent.children.push(node);
      } else {
        to.parent.children.splice(to.parent.children.findIndex(item => item.id === to.id) + 1, 0, node);
      }
      parentNodeAfter = to.parent;
    } else {
      if (nodes.findIndex(item => item.id === to.id) === nodes.length - 1) {
        nodes.push(node);
      } else {
        nodes.splice(nodes.findIndex(item => item.id === to.id), 0, node);
      }
      parentNodeAfter = null;
    }

    if (parentNodeBefore !== parentNodeAfter) {
      this.itemChange.emit({
        id: node.id,
        type: 'parent',
        oldValue: node.parent ? node.parent.id : null,
        newValue: to.parent ? to.parent.id : null,
      });
      node.parent = to.parent;
    }

    if (parentNodeBefore) {
      this.updateSequence(parentNodeBefore.children);
    } else {
      this.updateSequence(nodes);
    }
    if (parentNodeAfter) {
      this.updateSequence(parentNodeAfter.children);
    } else {
      this.updateSequence(nodes);
    }

    this.refreshNodes(nodes);

    // TODO: expand node directly after mat-tree bug #30403 is fixed
    if (node.parent) {
      let parent: HierarchyNode | undefined | null = this.nodeMap().get(node.parent.id);
      while (parent) {
        this.tree()?.expand(parent);
        parent = parent.parent;
      }
    }
  }

  updateSequence(nodes: HierarchyNode[]) {
    nodes.forEach((node, i) => {
      if (node.sequence !== i) {
        this.itemChange.emit({
          id: node.id,
          type: 'sequence',
          oldValue: node.sequence,
          newValue: i,
        });
        node.sequence = i;
      }
    });
  }

}
