# Application layer

In the first version I did not make `application` a strictly isolated layer.

For one screen it was closer to a thin layer between the fetched data and the UI, and some preparation could live close to the components. I knew I could draw the boundary more strictly, but I did not have a second use case that justified doing it.

Once I examined how the chart and table consumed the same domain tree, I noticed that keeping their data preparation close to React made the solution too tailored to one rendering flow. If I want the UI to remain extensible, it should not both render the data and know how the financial tree is structured and how to transform that tree into whatever the current component needs.

If the service layer now answers "how do I get trusted data?", the application layer answers a different question: "what exactly does the application need from those data?"

The application now receives an already trusted `FinancialReport`. It knows nothing about fetch, Zod, retry, JSON, or HTTP.

The report is then converted into two separate projections: one for the chart and one for the table.

Why not just pass `FinancialReport` directly into React and do everything there?

I could. It would be shorter.

But then the React component would need to know how the company tree is structured, where the employees are, where the channels are, how they are aggregated, how table rows are built, where row depth comes from, and how parent relationships are calculated.

At that point the component is not only rendering data. It is preparing the data for itself as well.

After the refactor the UI gets an already prepared representation.

For the chart, the application creates the periods, the values, and the series.

For the table, the tree is flattened into rows that already contain `depth`, `ancestorIds`, and `hasChildren`.

React does not need to re-analyze the domain just to figure out how to visualize it.

`createLoadFinancialReportView` also appeared here. It is basically the main use case of the current application. It receives a function that can load a report, waits for the `FinancialReport`, and builds both projections.

I deliberately did not introduce a repository abstraction just so I could say that I have dependency inversion.

For the current number of dependencies, passing a function is enough. The application does not know the concrete implementation, so the boundary already exists.

To stop the concrete service implementation from leaking back into the application or UI, there is a small composition root where `financialReportApiAdapter` meets `createLoadFinancialReportView`.

That is basically the only place that knows both sides.

If the way the report is loaded changes tomorrow, the application use case can stay the same and I can pass another function. Building a DI container for one such connection does not give me anything useful.
