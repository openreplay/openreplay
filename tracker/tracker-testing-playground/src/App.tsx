import React from "react";
import Tracker from "@openreplay/tracker";
import axios from "axios";

import { userId, getTracker, store } from "./tracker";

import logo from "./logo.svg";
import "./App.css";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

const trackerEx = getTracker();

function App() {
  const [view, setView] = React.useState("main");
  const [tracker, setTracker] = React.useState<Tracker>();
  const [counter, setCounter] = React.useState(store.getState().value);
  const [data, setData] = React.useState(() => [...defaultData]);
  const [shouldRerender, setShould] = React.useState(false);
  const [sRen, setRen] = React.useState(true);
  const [sUrl, setURL] = React.useState("");
  const rerender = React.useReducer(() => ({}), {})[1];
  const [input, setInput] = React.useState("");
  store.subscribe(() => setCounter(store.getState().value));

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const chasd = () => {
    data.forEach((i) => (i.age = Math.floor(Math.random() * 100)));
    console.log(data[0]);
    setData(data);

    rerender();
  };

  React.useEffect(() => {
    trackerEx.start().then((session) => {
      console.log(session);
      const url = trackerEx.getSessionURL();
      setURL(url || "");
      setTracker(trackerEx);
    });
  }, []);

  React.useEffect(() => {
    const id = setInterval(() => shouldRerender && rerender(), 5000);
    return () => clearInterval(id);
  }, [rerender, shouldRerender]);

  if (!sRen)
    return (
      <div>
        <button id="testrender" onClick={() => setRen(true)}>
          test
        </button>
        test
      </div>
    );

  const testAPI = () => {
    fetch("https://pokeapi.co/api/v2/pokemon/ditto")
      .then((r) => r.json())
      .then((p) => console.log(p));
  };

  const testAPIError = () => {
    fetch("https://pokeapi.co/api/v2/poakemon/ditto")
      .then((r) => r.json())
      .then((p) => console.log(p));
  };

  const incrementRedux = () => {
    store.dispatch({ type: "counter/incremented" });
  };
  const redux2 = () => {
    store.dispatch({ type: "counter/test" });
  };
  const redux3 = () => {
    store.dispatch({ type: "counter/test2" });
  };
  const redux4 = () => {
    store.dispatch({ type: "counter/test3" });
  };

  const customEvent = () => {
    tracker?.event("test", "event");
  };

  const customError = () => {
    tracker?.handleError(new Error(), { testing: "stuff", taha: "is cool" });
  };

  const testJSError = () => {
    throw new Error("Im the error");
  };

  const axiosInst = axios.create();

  const addAxios = () => {
    console.log("hull");
  };
  const testAxiosApi = () => {
    axiosInst("https://pokeapi.co/api/v2/pokemon/ditto").then((p) =>
      console.log(p)
    );
  };
  return (
    <>
      <button id="testrender" onClick={() => setRen(false)}>
        test rerender
      </button>
      <button onClick={testAPI} id={"test-api"}>test api</button>
      <button onClick={testAPIError}>test api error</button>
      <button id="redcounter" onClick={incrementRedux}>
        test Redux {counter}
      </button>
      <button onClick={customEvent} id={"test-event"}>test custom event</button>
      <button onClick={customError}>test custom tags error</button>
      <button onClick={addAxios}>add axios</button>
      <button onClick={testAxiosApi}>test axios</button>
      <a href="https://google.com">test link</a>
      <br />
      <button onClick={redux2}>test Redux {counter}</button>
      <button onClick={redux3}>test Redux {counter}</button>
      <button onClick={redux4}>test Redux {counter}</button>
      <button onClick={testJSError}>JS Error</button>
      <br />
      <button id={"get-main"} onClick={() => setView('main')}>main</button>
      <button id={"get-table"} onClick={() => setView('table')}>table</button>
      {view} view
      <div className="App">
        {view === "main" ? (
          <header className="App-header">
            {/* <iframe src="https://fr.wikipedia.org/wiki/Main_Page" width="640" height="480" title="testing"></iframe> */}
            <img src={logo} className="App-logo" alt="logo" />
            <span>Your userId is [{userId}]</span>
            <span>
              session url:{" "}
              <a rel="noreferrer noopener" target="_blank" href={sUrl}>
                {sUrl}
              </a>
            </span>
            <input
              id="visible-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              type="text"
            />
            <div className="testhide"> should not be seen here</div>
            <input
              className="testobscure"
              placeholder="test"
              id="testobscured"
            ></input>
            <div data-openreplay-obscured id="obscured-div">
              obscured
            </div>
            <div data-openreplay-masked id="masked-div">
              masked deprecated
            </div>
            <input
              data-openreplay-obscured
              type="text"
              id="obscured-text"
              placeholder="obscured text"
            ></input>
          </header>
        ) : (
          <div className="p-2" style={{ display: 'flex'}}>
            <table>
              <thead>
                {table
                  .getHeaderGroups()
                  .map(
                    (headerGroup: {
                      id: React.Key | null | undefined;
                      headers: any[];
                    }) => (
                      <tr key={headerGroup.id + Math.random().toString(36)}>
                        {headerGroup.headers.map(
                          (header: {
                            id: React.Key | null | undefined;
                            isPlaceholder: any;
                            column: { columnDef: { header: any } };
                            getContext: () => any;
                          }) => (
                            <th key={header.id + Math.random().toString(36)}>
                              {header.isPlaceholder
                                ? null
                                : flexRender(
                                    header.column.columnDef.header,
                                    header.getContext()
                                  )}
                            </th>
                          )
                        )}
                      </tr>
                    )
                  )}
              </thead>
              <tbody>
                {table
                  .getRowModel()
                  .rows.map(
                    (row: {
                      id: React.Key | null | undefined;
                      getVisibleCells: () => any[];
                    }) => (
                      <tr key={row.id + Math.random().toString(36)}>
                        {row
                          .getVisibleCells()
                          .map(
                            (cell: {
                              id: React.Key | null | undefined;
                              column: { columnDef: { cell: any } };
                              getContext: () => any;
                            }) => (
                              <td key={cell.id + Math.random().toString(36)}>
                                {flexRender(
                                  cell.column.columnDef.cell,
                                  cell.getContext()
                                )}
                              </td>
                            )
                          )}
                      </tr>
                    )
                  )}
              </tbody>
              <tfoot>
                {table
                  .getFooterGroups()
                  .map(
                    (footerGroup: {
                      id: React.Key | null | undefined;
                      headers: any[];
                    }) => (
                      <tr key={footerGroup.id + Math.random().toString(36)}>
                        {footerGroup.headers.map(
                          (header: {
                            id: React.Key | null | undefined;
                            isPlaceholder: any;
                            column: { columnDef: { footer: any } };
                            getContext: () => any;
                          }) => (
                            <th key={header.id + Math.random().toString(36)}>
                              {header.isPlaceholder
                                ? null
                                : flexRender(
                                    header.column.columnDef.footer,
                                    header.getContext()
                                  )}
                            </th>
                          )
                        )}
                      </tr>
                    )
                  )}
              </tfoot>
            </table>
            <table>
              <thead>
              {table
                .getHeaderGroups()
                .map(
                  (headerGroup: {
                    id: React.Key | null | undefined;
                    headers: any[];
                  }) => (
                    <tr key={headerGroup.id + Math.random().toString(36)}>
                      {headerGroup.headers.map(
                        (header: {
                          id: React.Key | null | undefined;
                          isPlaceholder: any;
                          column: { columnDef: { header: any } };
                          getContext: () => any;
                        }) => (
                          <th key={header.id + Math.random().toString(36)}>
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                          </th>
                        )
                      )}
                    </tr>
                  )
                )}
              </thead>
              <tbody>
              {table
                .getRowModel()
                .rows.map(
                  (row: {
                    id: React.Key | null | undefined;
                    getVisibleCells: () => any[];
                  }) => (
                    <tr key={row.id + Math.random().toString(36)}>
                      {row
                        .getVisibleCells()
                        .map(
                          (cell: {
                            id: React.Key | null | undefined;
                            column: { columnDef: { cell: any } };
                            getContext: () => any;
                          }) => (
                            <td key={cell.id + Math.random().toString(36)}>
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext()
                              )}
                            </td>
                          )
                        )}
                    </tr>
                  )
                )}
              </tbody>
              <tfoot>
              {table
                .getFooterGroups()
                .map(
                  (footerGroup: {
                    id: React.Key | null | undefined;
                    headers: any[];
                  }) => (
                    <tr key={footerGroup.id + Math.random().toString(36)}>
                      {footerGroup.headers.map(
                        (header: {
                          id: React.Key | null | undefined;
                          isPlaceholder: any;
                          column: { columnDef: { footer: any } };
                          getContext: () => any;
                        }) => (
                          <th key={header.id + Math.random().toString(36)}>
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                header.column.columnDef.footer,
                                header.getContext()
                              )}
                          </th>
                        )
                      )}
                    </tr>
                  )
                )}
              </tfoot>
            </table>
            <div className="h-4" />
          </div>
        )}
      </div>
    </>
  );
}

export default App;

type Person = {
  firstName: string;
  lastName: string;
  age: number;
  visits: number;
  status: string;
  progress: number;
};

const defaultData: Person[] = [
  {
    firstName: "tanner",
    lastName: "linsley",
    age: Math.floor(Math.random() * 100),
    visits: 100,
    status: "In Relationship",
    progress: 50,
  },
  {
    firstName: "tandy",
    lastName: "miller",
    age: 40,
    visits: 40,
    status: "Single",
    progress: 80,
  },
  {
    firstName: "joe",
    lastName: "dirte",
    age: 45,
    visits: 20,
    status: "Complicated",
    progress: 10,
  },
];

const testArr = [...defaultData];

for (let i = 0; i < 30; i++) {
  defaultData.push(...testArr);
}

const columns: ColumnDef<Person>[] = [
  {
    accessorKey: "firstName",
    cell: (info: { getValue: () => any }) => info.getValue(),
    footer: (info: { column: { id: any } }) => info.column.id,
  },
  {
    accessorFn: (row: { lastName: any }) => row.lastName,
    id: "lastName",
    cell: (info: {
      getValue: () =>
        | boolean
        | React.ReactChild
        | React.ReactFragment
        | React.ReactPortal
        | null
        | undefined;
    }) => <i>{info.getValue()}</i>,
    header: () => <span>Last Name</span>,
    footer: (info: { column: { id: any } }) => info.column.id,
  },
  {
    accessorKey: "age",
    header: () => "Age",
    footer: (info: { column: { id: any } }) => info.column.id,
  },
  {
    accessorKey: "visits",
    header: () => <span>Visits</span>,
    footer: (info: { column: { id: any } }) => info.column.id,
  },
  {
    accessorKey: "status",
    header: "Status",
    footer: (info: { column: { id: any } }) => info.column.id,
  },
  {
    accessorKey: "progress",
    header: "Profile Progress",
    footer: (info: { column: { id: any } }) => info.column.id,
  },
];
