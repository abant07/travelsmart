from beaker import *
from pyteal import *
from beaker.lib.storage import BoxMapping

class Ticket(abi.NamedTuple):
    airline: abi.Field[abi.String]
    flightNumber: abi.Field[abi.Uint64]
    ticketPrice: abi.Field[abi.Uint64]
    seat: abi.Field[abi.String]
    departureDate: abi.Field[abi.Uint64]
    departureLocation: abi.Field[abi.String]
    arrivalLocation: abi.Field[abi.String]
    arrivalDate: abi.Field[abi.Uint64]
    ticketHolderFirstName: abi.Field[abi.String]
    ticketHolderLastName: abi.Field[abi.String]
    ticketHolderPhoneNumber: abi.Field[abi.String]
    ticketHolderAddress: abi.Field[abi.Address]
    ticketReceiver: abi.Field[abi.Address]
    status: abi.Field[abi.String]


class MyState:
    airline_tickets = BoxMapping(abi.String, Ticket)

app = Application("airline_ticket_transfer", state=MyState(), descr="Sell your plane tickets")

@app.external(authorize=Authorize.only_creator())
def initialize_asset(mbrPay: abi.PaymentTransaction) -> Expr:
    return InnerTxnBuilder.Execute (
        {
            TxnField.type_enum: TxnType.AssetConfig,
            TxnField.config_asset_total: Int(1000000000),
            TxnField.config_asset_decimals: Int(0),
            TxnField.config_asset_unit_name: Bytes("FLYS"),
            TxnField.config_asset_name: Bytes("FlyCoin"),
            TxnField.config_asset_manager: Global.current_application_address(),
            TxnField.config_asset_reserve: Global.current_application_address(),
            TxnField.config_asset_freeze: Global.current_application_address(),
            TxnField.config_asset_clawback: Global.current_application_address(),
        }
    )

#send atomic transaction with creating the ASA unless you already check that confirmationNumber exists,
# then just send atomic transaction of transferring ASA to smart contract and calling method
@app.external
def create_ticket(boxPay: abi.PaymentTransaction,
                  confirmationNumber: abi.String,
                  assetId: abi.Uint64,
                  firstName: abi.String,
                  lastName: abi.String,
                  phoneNumber: abi.String,
                  airline: abi.String,
                  flightNumber: abi.Uint64,
                  ticketPrice: abi.Uint64,
                  seat: abi.String,
                  departureDate: abi.Uint64,
                  arrivalDate: abi.Uint64,
                  departureLocation: abi.String,
                  arrivalLocation: abi.String,
                  *, output: Ticket) -> Expr:
    holder = abi.Address()
    receiver = abi.Address()
    status = abi.String()
    airline_ticket_tuple = Ticket()
    return Seq (
        Assert(boxPay.get().receiver() == Global.current_application_address()),
        InnerTxnBuilder.Execute(
            {
                TxnField.type_enum: TxnType.AssetTransfer,
                TxnField.fee: Int(0),  # cover fee with outer txn
                TxnField.asset_receiver: Txn.sender(),
                TxnField.xfer_asset: assetId.get(),
                TxnField.asset_amount: Int(1)
            }
        ),
        holder.set(Txn.sender()),
        receiver.set(Txn.sender()),
        status.set(Bytes("created")),
        airline_ticket_tuple.set(airline, flightNumber, ticketPrice, seat, departureDate,
                                 departureLocation, arrivalLocation, arrivalDate,
                                 firstName, lastName, phoneNumber, holder, 
                                 receiver, status),
        app.state.airline_tickets[confirmationNumber.get()].set(airline_ticket_tuple),
        app.state.airline_tickets[confirmationNumber.get()].store_into(output)
    )


@app.external
def sell_ticket(axfer: abi.AssetTransferTransaction,
                confirmationNumber: abi.String,
                ticketReceiver: abi.Address,
                inMarket: abi.Bool) -> Expr:
    
    ticketHolder = abi.Address()
    airline = abi.String()
    flightNumber = abi.Uint64()
    ticketPrice = abi.Uint64()
    seat = abi.String()
    departureDate = abi.Uint64()
    arrivalDate = abi.Uint64()
    departureLocation = abi.String()
    arrivalLocation = abi.String()
    status = abi.String()
    firstname = abi.String()
    lastname = abi.String()
    phonenumber = abi.String()
    airline_ticket_tuple = Ticket()

    return Seq (
        airline_ticket_tuple.decode(app.state.airline_tickets[confirmationNumber.get()].get()),
        Assert(axfer.get().asset_receiver() == Global.current_application_address(),  comment="Asset must go to smart contract to be able to sell"),

        ticketHolder.set(airline_ticket_tuple.ticketHolderAddress),
        airline.set(airline_ticket_tuple.airline),
        seat.set(airline_ticket_tuple.seat),
        departureDate.set(airline_ticket_tuple.departureDate),
        arrivalDate.set(airline_ticket_tuple.arrivalDate),
        flightNumber.set(airline_ticket_tuple.flightNumber),
        departureLocation.set(airline_ticket_tuple.departureLocation),
        arrivalLocation.set(airline_ticket_tuple.arrivalLocation),
        ticketPrice.set(airline_ticket_tuple.ticketPrice),
        firstname.set(airline_ticket_tuple.ticketHolderFirstName),
        lastname.set(airline_ticket_tuple.ticketHolderLastName),
        phonenumber.set(airline_ticket_tuple.ticketHolderPhoneNumber),

        If (
            inMarket.get() == Int(0),
            status.set(Bytes("transfer")),
            status.set(Bytes("market"))
        ),

        airline_ticket_tuple.set(airline, flightNumber, ticketPrice, seat, departureDate,
                                 departureLocation, arrivalLocation, arrivalDate,
                                 firstname, lastname, phonenumber, ticketHolder, 
                                 ticketReceiver, status),
        app.state.airline_tickets[confirmationNumber.get()].set(airline_ticket_tuple)
    )

#send atomic transaction of buying the ASA from the tickerHolder, make sure ticket receiver is person the holder wants to send to
# this will opt the smart contract of the ASA and give all supply to the transaction caller
@app.external
def buy_ticket(payment: abi.PaymentTransaction,
               fee1: abi.PaymentTransaction,
               fee2: abi.PaymentTransaction,
               assetId: abi.Uint64,
               confirmationNumber: abi.String,
               firstName: abi.String,
               lastName: abi.String,
               phoneNumber: abi.String,
               *, output: Ticket) -> Expr:
    ticketHolder = abi.Address()
    airline = abi.String()
    flightNumber = abi.Uint64()
    ticketPrice = abi.Uint64()
    seat = abi.String()
    ticketReceiver = abi.Address()
    departureDate = abi.Uint64()
    arrivalDate = abi.Uint64()
    departureLocation = abi.String()
    arrivalLocation = abi.String()
    status = abi.String()
    airline_ticket_tuple = Ticket()

    return Seq (
        airline_ticket_tuple.decode(app.state.airline_tickets[confirmationNumber.get()].get()),
        ticketPrice.set(airline_ticket_tuple.ticketPrice),
        ticketReceiver.set(airline_ticket_tuple.ticketReceiver),
        ticketHolder.set(airline_ticket_tuple.ticketHolderAddress),

        Assert(payment.get().amount() == ticketPrice.get(), comment="Insufficient funds to buy ticket"),
        Assert(fee1.get().amount() > Int(0), comment="Insufficient amount sent to airline"),
        Assert(fee2.get().amount() > Int(0), comment="Insufficient amount sent to TravelSmart"),
        If (
            ticketReceiver.get() != ticketHolder.get(),
            Assert(payment.get().sender() == ticketReceiver.get(), comment="ticket must be bought by designated receiver"),
        ),
        Assert(payment.get().receiver() == ticketHolder.get(), comment="payment must go to current ticket holder"),

        InnerTxnBuilder.Execute(
            {
                TxnField.type_enum: TxnType.AssetTransfer,
                TxnField.fee: Int(0),  # cover fee with outer txn
                TxnField.xfer_asset: assetId.get(),
                TxnField.asset_amount: Int(1),
                TxnField.asset_receiver: Txn.sender()
            }
        ),
        ticketHolder.set(Txn.sender()),
        airline.set(airline_ticket_tuple.airline),
        seat.set(airline_ticket_tuple.seat),
        departureDate.set(airline_ticket_tuple.departureDate),
        arrivalDate.set(airline_ticket_tuple.arrivalDate),
        flightNumber.set(airline_ticket_tuple.flightNumber),
        departureLocation.set(airline_ticket_tuple.departureLocation),
        arrivalLocation.set(airline_ticket_tuple.arrivalLocation),
        ticketReceiver.set(Txn.sender()),
        status.set(Bytes("bought")),

        airline_ticket_tuple.set(airline, flightNumber, ticketPrice, seat, departureDate,
                                 departureLocation, arrivalLocation, arrivalDate,
                                 firstName, lastName, phoneNumber, ticketHolder, 
                                 ticketReceiver, status),
        app.state.airline_tickets[confirmationNumber.get()].set(airline_ticket_tuple),
        app.state.airline_tickets[confirmationNumber.get()].store_into(output)
    )
