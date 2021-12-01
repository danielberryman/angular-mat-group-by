# Doing GroupBy with AngularMaterial Table

## Introduction
I recently needed to implement a GroupBy filter on a table in an Angular App using Angular Material's table component. I didn't find a super clear explanation so I decided to write one. I did find a couple stack blitz's very helpful so a big THANK YOU to the following for getting me started:
- @lujian98: https://stackblitz.com/edit/angular-material-table-row-grouping
- @StephenWTurner: https://stackblitz.com/edit/angular-mattable-with-groupheader

## TL:DR
- Create a new project
- Install Angular Material
- Summary
  - When using angular material you set an array to the table's dataSource.data property. To get GROUP BY working you're still setting an array to dataSource.data. The difference is this...the records in your unfilitered array once filtered or grouped will 1) be grouped according to the filters applied and 2) before each group you will insert a record into the array that's of a different custom type than the records in the unfilitered array. To reiterate your grouped/filtered array will have 2 different types of records in it: the type for the data you're filtering; the type for the GROUP BY header you use to separate groups.

## Build Your Data

### Create an interface for the data you'll be using
- For this demo I choose data related to pizza.
- I kept things simple giving my model a size (large, medium, small), number of toppings, and an array of toppings
```javascript
export interface Pizza {
  size: string,
  noOfToppings: number,
  toppings: string[]
}
```

### Create the Group By Header interface
- You can call this whatever you want
- It will at least need the following properties: name; a boolean to keep track if it's a group by header row
```javascript
export interface GroupByHeader {
  name: string,
  isGroupBy: boolean
}
```

## Basic HTML Setup

### Buttons for filtering
- I decided to use buttons to choose which filters were applied and which weren't but you implement this in different ways
- *I'd like to adapt this to the use an input*
- In the component we will set up what we can filter by via a list we'll call `filters`
- Each filter has 2 properties: `name` and `active`
- Here we use *ngFor structural directive to render all the filters we've declared in the component
- We're using Bootstrap to set the btn styling based on whether the filter is active or not
- Then we bind to the click event via `(click)` and call the method we'll setup in the component `handleFilter` and pass to the name of the filter associated with whatever button is bein rendered.
```html
<button
  *ngFor="let filter of filters"
  [ngClass]="filter.active ? 'btn btn-info' : 'btn btn-light'"
  (click)="handleFilter(filter.name)"
>{{filter.name}}</button>
```

### Table basics
- We use a table element for the table
- We give the table a template variable `#table`
- From Angular Material docs: `The mat-table provides a Material Design styled data-table that can be used to display rows of data.`
- You'll see in the component that we use the Object type `MatTableDataSource`. The dataSource property is declared on this object so we use data binding here to set it with a variable we'll declare in the component `dataSource`.
- Then you set your columns with Angular Material refs `matColumnDef, mat-header-cell, *matHeaderCellDef, mat-cell, *matCellDef`. I'm not going to go into specifics for all of these.
- `*matCellDef` is important to mention because you use it to reference the object being used to create specific row (this is one element in your data array) and you can then use the variable declared to reference the objects property values
- Then declare 2 table rows:
  1. The general header row uses `*matHeaderCellDef` and takes a parameter which is an array of strings that define the column names.
  2. The row that defines how all the rows populated by your data are displayed. You defined how to reference the row `let row;` and then you also declared what columns these rows use `columns:`
```html
<table #table mat-table [dataSource]="dataSource">
  <ng-container matColumnDef="size">
    <th mat-header-cell *matHeaderCellDef>Size:</th>
    <td mat-cell *matCellDef="let pizza">{{pizza.size}}</td>
  </ng-container>
  <ng-container matColumnDef="nooftoppings">
    <th mat-header-cell *matHeaderCellDef>No. Of Toppings:</th>
    <td mat-cell *matCellDef="let pizza">{{pizza.noOfToppings}}</td>
  </ng-container>
  <ng-container matColumnDef="toppings">
    <th mat-header-cell *matHeaderCellDef>Toppings:</th>
    <td mat-cell *matCellDef="let pizza">{{pizza.toppings.join(', ')}}</td>
  </ng-container>

  <tr mat-header-row *matHeaderRowDef="displayedColumns; sticky: true;"></tr>
  <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
</table>
```

## Basic Component Setup

### Data
- Either create your fake data as a constant or bring in your data via API call (beyond scope of this article)
- In the component initialize variables we talked about above
  - `@ViewChild(MatTable) table: MatTable<any>;` This decorator makes use of the template variable we declared on the table element in our HTML. We need to rerender the DOM after we've reset dataSource.data after each GROUP BY. And MatTable is the Angular Material obj being used.
  - Then I'm setting the constant `PIZZAS` (which has my list of pizzas) to a property pizzaList. I use this property as the original list returned before any group by so I can reset the list to it's original state once all filters/group bys are removed
  - Then we set the dataSource with a copy of the pizzaList
  - We set the array of strings the represent the column names we want displayed
  - We setup a Set to track active filters (which filters have been applied and which have not)
  - We setup of the actual array of filter object we want to use (again each has a name and an active boolean to track their status)
  - And finally the `currentFiliteredList` which keeps track at any given time of the current list in any filtered state
```javascript
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
```

## Building The Component's GROUP BY Functionality

### Overall Filter Handler
- This function encapsulates everything that needs to be done when filtering or doing GROUP BY
- Structure: toggle btns, filter, build grouped data, reset the dataSource, rerender the table rows
```javascript
handleFilter(filterName?: string) {
  if (filterName) { this.toggleFilter(filterName); }

  if (this.activeFilters.size > 0) {
    this.filterData();
    filterName = this.getLastActiveFilter();
    this.currentFilteredList = this.buildGroupByData(this.currentFilteredList, this.activeFilters.values(), 0, true, filterName);
  }

  this.resetData();
  this.rerenderTable();
}
```

### Toggle buttons
- You can look at the code in the repo if you like but it's pretty simple
  - Iterate through filters
  - If the filter matches the filter passed in on the btn click then...
  - Toggle the filter.active property
  - Add or remove the filter from this.activeFilters

### Filter the data
- For filtering I decided to implement a Hash Table. I created a map with keys based on the possible values in the specific filter column's data and set counts to each key. Then I filtered the original data from the pizzaList array based on whether the specific filter key had a count greater than 2.

### Build the group by into the data
- To build the grouped data I made use of recursion in the event there were 1+ filters
- *This method currently calculates the entire grouping every time. There's room for optimization here.*
- Here's the Psuedocode
  - sort by the first filter
  - iterate through the list of records you've already filtered to ensure each record has at least one duplicate
  - TODO: continue to work through this function explanation

### Reset the list and rerender the table


## Update HTML for doing GROUP BY
```html
<ng-container matColumnDef="groupHeader">
  <td mat-cell *matCellDef="let groupBy" colspan="8" class="groupByHeaderRow">{{ groupBy.name }}</td>
</ng-container>

<tr mat-row *matRowDef="let row; columns: ['groupHeader']; when: isGroup"></tr>
```
