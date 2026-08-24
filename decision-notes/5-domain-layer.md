# Domain layer

The logic here was similar.

In the first version the difference between the API response and the internal type was almost nominal. If I control the API myself and already treat it as trusted, creating almost the same second model plus a mapper looks like copying an object just to say that I have a separate domain.

Once runtime validation made the API response an explicit external contract rather than an implicitly trusted `FinancialReport`, this boundary stopped being artificial. The external contract can now change independently from the model the application works with.

I do not treat the domain in this project as an attempt to build full DDD.

This is a read-only dashboard. There are no complex commands, aggregate mutations, transactions, or rich entity behavior.

For me the domain layer is mainly a stable typed model that the internal parts of the application can use after the service boundary has done its job.

The DTO belongs to the service layer.

`FinancialReport` is the internal model.

Plain types are enough for the current application. I try to add an abstraction because it has a concrete responsibility, not because I know how to build it.
