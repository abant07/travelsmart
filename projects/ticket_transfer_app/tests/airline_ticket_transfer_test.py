import pytest
from algokit_utils import *
from algokit_utils.beta.algorand_client import AlgorandClient, PayParams, AssetCreateParams, AssetTransferParams, AssetOptInParams
from algokit_utils.beta.account_manager import AddressAndSigner
import algosdk
from smart_contracts.artifacts.airline_ticket_transfer.client import AirlineTicketTransferClient
from algosdk.atomic_transaction_composer import TransactionWithSigner

@pytest.fixture(scope="session")
def algorand() -> AlgorandClient:
    """Get an AlgorandClient to use throughout the tests"""
    client = AlgorandClient.default_local_net()
    client.set_default_validity_window(1000)
    return client

@pytest.fixture(scope="session")
def dispenser(algorand: AlgorandClient) -> AddressAndSigner:
    """Get the dispensor to fund test addresses"""
    return algorand.account.dispenser()

@pytest.fixture(scope="session")
def creator(algorand: AlgorandClient, dispenser: AddressAndSigner) -> AddressAndSigner:
    """Create a creator account for the application"""
    acct = algorand.account.random()

    algorand.send.payment(PayParams(
        sender=dispenser.address,
        receiver=acct.address,
        amount=10_000_000
    ))

    return acct

@pytest.fixture(scope="session")
def airline_ticket_transfer_client(algorand: AlgorandClient, creator: AddressAndSigner) -> AirlineTicketTransferClient:
    """Instantiate an application client we can use for our tests"""
    client = AirlineTicketTransferClient(
        algod_client=algorand.client.algod,
        sender=creator.address,
        signer=creator.signer
    )

    client.create_bare()

    return client

@pytest.fixture(scope="session")
def ticket_sender(algorand: AlgorandClient, dispenser: AddressAndSigner) -> AddressAndSigner:
    """Create a ticket sender for the application"""
    acct = algorand.account.random()

    algorand.send.payment(PayParams(
        sender=dispenser.address,
        receiver=acct.address,
        amount=10_000_000
    ))

    return acct

@pytest.fixture(scope="session")
def ticket_receiver(algorand: AlgorandClient, dispenser: AddressAndSigner) -> AddressAndSigner:
    """Create a ticket receiver for the application"""
    acct = algorand.account.random()

    algorand.send.payment(PayParams(
        sender=dispenser.address,
        receiver=acct.address,
        amount=10_000_000
    ))

    return acct

@pytest.fixture(scope="session")
def second_ticket_receiver(algorand: AlgorandClient, dispenser: AddressAndSigner) -> AddressAndSigner:
    """Create a second ticket receiver for the application"""
    acct = algorand.account.random()

    algorand.send.payment(PayParams(
        sender=dispenser.address,
        receiver=acct.address,
        amount=10_000_000
    ))

    return acct

def test_create_ticket(airline_ticket_transfer_client: AirlineTicketTransferClient, 
                           ticket_sender: AddressAndSigner,
                           test_asset_id: int,
                           algorand: AlgorandClient,
                           dispenser: AddressAndSigner):
    #ensure get_asset_information thorws an error because the app is not yet opted in
    pytest.raises(algosdk.error.AlgodHTTPError, lambda:
        algorand.account.get_asset_information(airline_ticket_transfer_client.app_address, test_asset_id)
    )

    sp = algorand.get_suggested_params()
    sp.flat_fee = True
    sp.fee = 2_000

    pay = algorand.transactions.payment(PayParams(
        sender=ticket_sender.address,
        receiver=airline_ticket_transfer_client.app_address,
        amount=500_000,
        signer=ticket_sender.signer
    ))

    result = airline_ticket_transfer_client.create_ticket(
        boxPay=TransactionWithSigner(
            txn=pay,
            signer=ticket_sender.signer
        ),
        confirmationNumber="ASDFGHJKLWERTYUIOP",
        assetId=1,
        firstName="Joe",
        lastName="Polny",
        phoneNumber="1234567890",
        airline="Alaska",
        flightNumber=128,
        ticketPrice=345,
        seat="34B",
        departureDate=12345678,
        arrivalDate=123456789,
        departureLocation="Seattle",
        arrivalLocation="London",
        transaction_parameters=TransactionParameters(
            #we are using this asset in the contract thus we need to tell AVM its assetid
            foreign_assets=[test_asset_id],
            suggested_params=sp,
            boxes=[(airline_ticket_transfer_client.app_id, "ASDFGHJKLWERTYUIOP")],
            sender=ticket_sender.address,
            signer=ticket_sender.signer
        ),
    )


    assert result.confirmed_round

    assert (algorand.account.get_asset_information(
        airline_ticket_transfer_client.app_address, test_asset_id
    ))["asset-holding"]["amount"] == 0

    assert (algorand.account.get_asset_information(
        ticket_sender.address, test_asset_id
    ))["asset-holding"]["amount"] == 1


def test_sell_ticket_to_person(airline_ticket_transfer_client: AirlineTicketTransferClient, 
                                ticket_sender: AddressAndSigner,
                                test_asset_id: int,
                                ticket_receiver: AddressAndSigner,
                                algorand: AlgorandClient):
    
    sp = algorand.get_suggested_params()
    sp.flat_fee = True
    sp.fee = 2_000
    
    asset_trans = algorand.transactions.asset_transfer(AssetTransferParams(
        sender=ticket_sender.address,
        asset_id=test_asset_id,
        receiver=airline_ticket_transfer_client.app_address,
        amount=1,
        signer=ticket_sender.signer
    ))

    result = airline_ticket_transfer_client.sell_ticket(
        axfer=TransactionWithSigner(
            txn=asset_trans, 
            signer=ticket_sender.signer
        ),
        confirmationNumber="ASDFGHJKLWERTYUIOP",
        ticketReceiver=ticket_sender.address,
        inMarket=True,
        transaction_parameters=TransactionParameters(
            #we are using this asset in the contract thus we need to tell AVM its assetid
            foreign_assets=[test_asset_id],
            boxes=[(airline_ticket_transfer_client.app_id, "ASDFGHJKLWERTYUIOP")],
            suggested_params=sp,
            sender=ticket_sender.address,
            signer=ticket_sender.signer
        )
    )

    assert result.confirmed_round

    assert (algorand.account.get_asset_information(
        airline_ticket_transfer_client.app_address, test_asset_id
    ))["asset-holding"]["amount"] == 1

    assert (algorand.account.get_asset_information(
        ticket_sender.address, test_asset_id
    ))["asset-holding"]["amount"] == 0


def test_buy_transferred_ticket(airline_ticket_transfer_client: AirlineTicketTransferClient, 
                                ticket_sender: AddressAndSigner,
                                ticket_receiver: AddressAndSigner,
                                test_asset_id: int,
                                algorand: AlgorandClient):

    sp = algorand.get_suggested_params()
    sp.flat_fee = True
    sp.fee = 2_000

    algorand.send.asset_opt_in(AssetOptInParams(
        sender=ticket_receiver.address,
        asset_id=test_asset_id,
        signer=ticket_receiver.signer
    ))

    pay = algorand.transactions.payment(PayParams(
        sender=ticket_receiver.address,
        receiver=ticket_sender.address,
        amount=345,
        signer=ticket_receiver.signer
    ))

    result = airline_ticket_transfer_client.buy_ticket(
        payment=TransactionWithSigner(
            txn=pay,
            signer=ticket_receiver.signer
        ),
        fee1=TransactionWithSigner(
            txn=pay,
            signer=ticket_receiver.signer
        ),
        fee2=TransactionWithSigner(
            txn=pay,
            signer=ticket_receiver.signer
        ),
        assetId=1,
        confirmationNumber="ASDFGHJKLWERTYUIOP",
        firstName="Ryan",
        lastName="Fox",
        phoneNumber="0987654321",
        transaction_parameters=TransactionParameters(
            #we are using this asset in the contract thus we need to tell AVM its assetid
            foreign_assets=[test_asset_id],
            sender=ticket_receiver.address,
            signer=ticket_receiver.signer,
            suggested_params=sp,
            boxes=[(airline_ticket_transfer_client.app_id, "ASDFGHJKLWERTYUIOP")]
        ),
    )

    assert result.confirmed_round

    assert (algorand.account.get_asset_information(
        ticket_receiver.address, test_asset_id
    ))["asset-holding"]["amount"] == 1

    assert (algorand.account.get_asset_information(
        ticket_sender.address, test_asset_id
    ))["asset-holding"]["amount"] == 0
    
    assert (algorand.account.get_asset_information(
        airline_ticket_transfer_client.app_address, test_asset_id
    ))["asset-holding"]["amount"] == 0


def test_sell_bought_ticket(airline_ticket_transfer_client: AirlineTicketTransferClient, 
                            ticket_sender: AddressAndSigner,
                           second_ticket_receiver: AddressAndSigner,
                           test_asset_id: int,
                           ticket_receiver: AddressAndSigner,
                           algorand: AlgorandClient):
    sp = algorand.get_suggested_params()
    sp.flat_fee = True
    sp.fee = 2_000
    
    asset_trans = algorand.transactions.asset_transfer(AssetTransferParams(
        sender=ticket_receiver.address,
        asset_id=test_asset_id,
        receiver=airline_ticket_transfer_client.app_address,
        amount=1,
        signer=ticket_receiver.signer
    ))

    result = airline_ticket_transfer_client.sell_ticket(
        axfer=TransactionWithSigner(
            txn=asset_trans, 
            signer=ticket_receiver.signer
        ),
        confirmationNumber="ASDFGHJKLWERTYUIOP",
        ticketReceiver=second_ticket_receiver.address,
        inMarket=False,
        transaction_parameters=TransactionParameters(
            #we are using this asset in the contract thus we need to tell AVM its assetid
            # in the near future this will be done automatically (python?) 
            foreign_assets=[test_asset_id],
            boxes=[(airline_ticket_transfer_client.app_id, "ASDFGHJKLWERTYUIOP")],
            suggested_params=sp,
            sender=ticket_receiver.address,
            signer=ticket_receiver.signer
        )
    )

    assert result.confirmed_round

    assert (algorand.account.get_asset_information(
        airline_ticket_transfer_client.app_address, test_asset_id
    ))["asset-holding"]["amount"] == 1

    assert (algorand.account.get_asset_information(
        ticket_receiver.address, test_asset_id
    ))["asset-holding"]["amount"] == 0

    assert (algorand.account.get_asset_information(
        ticket_sender.address, test_asset_id
    ))["asset-holding"]["amount"] == 0


def test_buy_bought_ticket(airline_ticket_transfer_client: AirlineTicketTransferClient, 
                            ticket_sender: AddressAndSigner,
                           second_ticket_receiver: AddressAndSigner,
                           test_asset_id: int,
                           ticket_receiver: AddressAndSigner,
                           algorand: AlgorandClient):
    sp = algorand.get_suggested_params()
    sp.flat_fee = True
    sp.fee = 2_000

    algorand.send.asset_opt_in(AssetOptInParams(
        sender=second_ticket_receiver.address,
        asset_id=test_asset_id,
        signer=second_ticket_receiver.signer
    ))

    pay = algorand.transactions.payment(PayParams(
        sender=second_ticket_receiver.address,
        receiver=ticket_receiver.address,
        amount=345,
        signer=second_ticket_receiver.signer
    ))

    result = airline_ticket_transfer_client.buy_ticket(
        payment=TransactionWithSigner(
            txn=pay,
            signer=second_ticket_receiver.signer
        ),
        fee1=TransactionWithSigner(
            txn=pay,
            signer=second_ticket_receiver.signer
        ),
        fee2=TransactionWithSigner(
            txn=pay,
            signer=second_ticket_receiver.signer
        ),
        assetId=1,
        confirmationNumber="ASDFGHJKLWERTYUIOP",
        firstName="Ryan",
        lastName="Fox",
        phoneNumber="0987654321",
        transaction_parameters=TransactionParameters(
            #we are using this asset in the contract thus we need to tell AVM its assetid
            foreign_assets=[test_asset_id],
            sender=second_ticket_receiver.address,
            signer=second_ticket_receiver.signer,
            suggested_params=sp,
            boxes=[(airline_ticket_transfer_client.app_id, "ASDFGHJKLWERTYUIOP")]
        ),
    )

    assert result.confirmed_round

    assert (algorand.account.get_asset_information(
        ticket_receiver.address, test_asset_id
    ))["asset-holding"]["amount"] == 0

    assert (algorand.account.get_asset_information(
        second_ticket_receiver.address, test_asset_id
    ))["asset-holding"]["amount"] == 1

    assert (algorand.account.get_asset_information(
        airline_ticket_transfer_client.app_address, test_asset_id
    ))["asset-holding"]["amount"] == 0

    assert (algorand.account.get_asset_information(
        ticket_sender.address, test_asset_id
    ))["asset-holding"]["amount"] == 0
