import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTable, MatTableDataSource } from '@angular/material/table';
import { GroupByHeader } from '../interfaces/GroupByHeader';
import { Pizza } from '../interfaces/Pizza';

const PIZZAS: Pizza[] = [
  {
    size: "small",
    noOfToppings: 1,
    toppings: ["pepperoni"]
  },
  {
    size: "small",
    noOfToppings: 2,
    toppings: ["pepperoni", "mushroom"]
  },
  {
    size: "medium",
    noOfToppings: 1,
    toppings: ["sausage"]
  },
  {
    size: "medium",
    noOfToppings: 2,
    toppings: ["olive", "green pepper"]
  },
  {
    size: "large",
    noOfToppings: 1,
    toppings: ["chicken"]
  },
  {
    size: "large",
    noOfToppings: 2,
    toppings: ["sausage", "green pepper"]
  },
  {
    size: "large",
    noOfToppings: 2,
    toppings: ["sausage", "red pepper"]
  }
]

@Component({
  selector: 'app-pizzas',
  templateUrl: './pizzas.component.html',
  styleUrls: ['./pizzas.component.scss']
})
export class PizzasComponent implements OnInit {
  @ViewChild(MatTable) table: MatTable<any>;
  pizzaList: Pizza[] = PIZZAS;
  dataSource = new MatTableDataSource<Pizza | GroupByHeader>(this.pizzaList.slice());
  displayedColumns: string[] = ["size","nooftoppings","toppings"];
  activeFilters = new Set<string>();
  filters = [
    { name: "size", active: false },
    { name: "noOfToppings", active: false }
  ];
  currentFilteredList: (Pizza | GroupByHeader)[];

  constructor() { }

  ngOnInit(): void {
  }

  handleFilter(filterName?: string) {
    if (filterName) { this.toggleFilter(filterName); }

    if (this.activeFilters.size > 0) {
      this.filterData();
      filterName = this.getLastActiveFilter();
      this.currentFilteredList = this.buildGroupByData(this.currentFilteredList, this.activeFilters.values(), 0, true, filterName);
    }

    this.resetDataSource();
    this.rerenderTable();
  }

  toggleFilter(filterName: string) {
    for (let i = 0; i < this.filters.length; i++) {
      let filter = this.filters[i];
      if (filterName === filter.name) {
        filter.active = filter.active ? false : true;
        this.activeFilters.has(filter.name) ? this.activeFilters.delete(filter.name) : this.activeFilters.add(filter.name);
        break;
      }
    }
  }

  filterData() {
    let tracker: Map<string, number> = new Map<string, number>();
    for (let n of this.pizzaList) {
      let key = this.getFilterKey(n);
      if (key !== "null") {
        if (key in tracker) {
          tracker[key] += 1;
        } else {
          tracker[key] = 1;
        }
      }
    }
    this.currentFilteredList = <(Pizza | GroupByHeader)[]>(this.pizzaList.filter(nl => tracker[this.getFilterKey(nl)] > 1));
  }

  getFilterKey(pizza: Pizza): string {
    let key = '';
    this.activeFilters.forEach(filter => {
      key += pizza[filter];
    });
    return key;
  }

  buildGroupByData(filteredList: (Pizza | GroupByHeader)[], activeFiltersItr, filterIndex: number, topLvGroup: boolean, filterName: string): (Pizza | GroupByHeader)[] {
    // TODO: This method currently calculates the entire grouping every time. Instead it should more efficiently start from the current group by
    // and use the recently added filter
    // We need to assume that this could be a second+ filter and the filtering needs to start with the most recently added filter
    // If we're removing then we need to momve back through the whole thing because we don't know which activeFilter we're removing (where it is in the Set)
    let result: (Pizza | GroupByHeader)[] = [];

    // sort by the first filter
    // this.sortByFilter(filteredList, activeFiltersItr.next().value);
    this.sortByFilter(filteredList, filterName);

    // identify the dups only according to the first filter and pass them to be sorted by the second filter
    // iterate through the temp list and separate into groups based on the first filter -> when we encounter a new record
    let start = 0;
    // let af = this.activeFilters.values();
    // let filter = af.next().value;
    for (let i = 0; i < filteredList.length; i++) {
      // if the filter value in the name list is different then we're in a new group
      let subSection;
      if (i === filteredList.length-1) {
        // There will always be matching items at the end because we'l already filtered the items to be dups based on all selected filters
        subSection = filteredList.slice(start, filteredList.length);
        if (topLvGroup) {
          // add GroupByHeader result
          let n = this.buildGroupByHeaderName(subSection.length ? subSection[0] : filteredList[0]);
          let g: GroupByHeader = { name: n, isGroupBy: true }
          result.push(g);
          // add SubSection to result
          result.push(...subSection);
        }
      } else if (i > 0 && filteredList[i][filterName] !== filteredList[i-1][filterName]) {
        // Check for base case: When filter is last filter then you don't need to filter anymore because you're now ordered by all filters
        if (filterIndex !== this.activeFilters.size && this.activeFilters.size > 1) {
          // There's more filters to sort by so call fn recursively
          subSection = this.buildGroupByData(filteredList.slice(start, i), activeFiltersItr, filterIndex++, false, filterName);
        }
        if (this.activeFilters.size === 1 || !subSection.length) {
          // We're sorted so just add the group header and the section up until now
          subSection = filteredList.slice(start, i);
        }
        if (topLvGroup) {
          // add GroupByHeader result
          let n = this.buildGroupByHeaderName(subSection.length ? subSection[0] : filteredList);
          let g: GroupByHeader = {
            name: n,
            isGroupBy: true
          }
          result.push(g);
          // add SubSection to result
          result.push(...subSection);
        }
        // reset start of the next section we're ordering to the current index before it's incremented
        start = i;
      }
    }
    // identify the dups according to the second filter and pass them to be sorted by the 3rd filter and so on
    // ** This is a recursive function based on the number of matches
    // ** What's the base case? The last filter
    // **** When you encounter a duplicate of all filters and the last element in the constructed element data array isn't a group header insert one
    return result;
  }

  sortByFilter(list: any[], filter: string): any[] {
    return list.sort((a,b) => {
      if(a[filter] < b[filter]) { return -1; }
      if(a[filter] > b[filter]) { return 1; }
    });
  }

  buildGroupByHeaderName(n: Pizza): string {
    let nameString = '';
    let lastFilter = this.getLastActiveFilter();
    this.activeFilters.forEach(f => {
      nameString += (f === lastFilter) ? `${f}: ${n[f]} ` :  `${f}: ${n[f]}, `;
    });
    return nameString.trim();
  }

  // Helpers
  rerenderTable() { this.table.renderRows(); }

  resetDataSource() {
    this.dataSource.data = this.activeFilters.size > 0 ? this.currentFilteredList.slice() : this.pizzaList;
  }

  isGroup(index, item): boolean {
    return item.isGroupBy;
  }

  getLastActiveFilter(): string {
    let value;
    this.activeFilters.forEach(filter => { value = filter; });
    return value;
  }
}
