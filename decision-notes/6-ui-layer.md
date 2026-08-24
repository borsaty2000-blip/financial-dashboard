# UI layer

The first version of `FinancialBarChart` and the table was intentionally specific.

The UI was specific too: one stacked bar chart and one hierarchical expandable table.

I did not know in which direction this UI could actually grow, so building universal components in advance looked like trying to guess a future requirement.

When I found reusable rendering behavior mixed with financial-specific preparation and tree traversal, I revisited the UI boundaries without flipping to the opposite extreme and making everything generic.

Instead, I looked at the code I already had and asked a simpler question: which responsibilities really have nothing to do with `financial-report`, and which ones are completely normal responsibilities of a feature component?

That split produced two shared renderers: `StackedBarChart`, which renders a stacked bar chart without knowing anything about the financial-report domain, and the `HierarchicalTable` components, which render and handle interaction for hierarchical data without knowing anything about `FinancialReport`.

This is the layer where separating financial-specific preparation from reusable rendering made me rethink the original approach the most, but the basic principle stayed the same: I still do not think unknown future requirements should be solved in advance with universal components.

For example, I could build a super-generic `Chart` with a huge config that can theoretically render line, bar, pie, and whatever else.

I do not have any of those requirements.

The only reusable responsibility I actually discovered was rendering a stacked bar chart from prepared data and a set of series.

That became `StackedBarChart`.

It knows nothing about financial reports, employees, or channels. It knows Recharts and knows how to render the configuration it receives.

`FinancialBarChart` remains a feature component. It is allowed to adapt the projected series into value accessors, choose their colors, format the period, and provide the accessibility text for this particular chart.

For me this is a much more honest boundary than one giant component that claims to be ready for every chart we might invent in the future.

The table went through a similar process, but I hit the opposite problem there.

If I call something a generic `Table`, but inside it I require `depth`, `hasChildren`, `expandedIds`, `ancestorIds`, and `onToggle`, it is not really generic.

It is a hierarchical table with a generic name.

So I narrowed the abstraction and gave it honest semantics: `HierarchicalTable`.

It knows nothing about `FinancialReport`, but it knows that it renders a tree. It has a row-header column, data columns, expandable rows, and leaf rows.

If I need a normal `Name / Email / Role` table tomorrow, I am not going to force it to pretend that it is a tree. A different renderer can appear if a real requirement calls for it.

That is probably the main conclusion I reached while working on extensibility: it does not always mean making everything as generic as possible. Sometimes it means naming the boundary more precisely and not making an abstraction promise more than it actually supports.
