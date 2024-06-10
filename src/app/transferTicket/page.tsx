"use client"
import Image from "next/image";
import { useRouter } from 'next/navigation';
import React from "react";
import * as algosdk from "algosdk"
import {PeraWalletConnect} from "@perawallet/connect"
import abi from "../../../components/abi.json"

const peraWallet = new PeraWalletConnect({
    shouldShowSignTxnToast: false
});

export default function Transfer() { 
    const [isConnected, setIsConnected] = React.useState(false);
    const [showDropdown, setShowDropdown] = React.useState(false);
    const [flightNumber, setFlightNumber] = React.useState("");
    const [airline, setAirline] = React.useState("");
    const [seatNumber, setSeatNumber] = React.useState("");
    const [departureLocation, setDepartureLocation] = React.useState("");
    const [departureDate, setDepartureDate] = React.useState("");
    const [arrivalDate, setArrivalDate] = React.useState("");
    const [arrivalDestination, setArrivalDestination] = React.useState("");
    const [confirmationNumber, setConfirmationNumber] = React.useState("");
    const [firstName, setFirstName] = React.useState("");
    const [lastName, setLastName] = React.useState("");
    const [phoneNumber, setPhoneNumber] = React.useState("");
    const [ticketPrice, setTicketPrice] = React.useState("");
    const [assetID, setAssetId] = React.useState("");
    const [status, setStatus] = React.useState("");
    const [receiver, setReceiver] = React.useState("");
    const [showToast, setShowToast] = React.useState(false);
    const [toastMessage, setToastMessage] = React.useState("");
    const [showPopup, setShowPopup] = React.useState(false);
    const [errorMessage1, setErrorMessage1] = React.useState(false);
    const [errorMessage2, setErrorMessage2] = React.useState(false);
    const [showPopup2, setShowPopup2] = React.useState(false);
    const [accountAddress, setAccountAddress] = React.useState("");
    const router = useRouter();

    React.useEffect(() => {
        // Reconnect to the session when the component is mounted
        peraWallet.reconnectSession().then((accounts) => {
            peraWallet.connector?.on("disconnect", handleDisconnectWalletClick);
            if (peraWallet.isConnected && accounts.length) {
                setAccountAddress(accounts[0]);
                setIsConnected(true);
            }
        });

        const loadFlightDeatils = () => {
            const departure = convertUnixTimestampToString(localStorage.getItem("departdate") ?? "Info Not Found")
            const arrival = convertUnixTimestampToString(localStorage.getItem("arrivaldate") ?? "Info Not Found")
            setFlightNumber(localStorage.getItem("flightnumber") ?? "Info Not Found")
            setAirline(localStorage.getItem("airline") ?? "Info Not Found")
            setSeatNumber(localStorage.getItem("seat") ?? "Info Not Found")
            setDepartureLocation(localStorage.getItem("departureLoc") ?? "Info Not Found")
            setDepartureDate(departure)
            setArrivalDate(arrival)
            setArrivalDestination(localStorage.getItem("arrivalLoc") ?? "Info Not Found")
            setConfirmationNumber(localStorage.getItem("confirmation") ?? "Info Not Found")
            setTicketPrice(localStorage.getItem("price") ?? "Info Not Found")
            setFirstName(localStorage.getItem("firstname") ?? "Info Not Found")
            setLastName(localStorage.getItem("lastname") ?? "Info Not Found")
            setPhoneNumber(localStorage.getItem("phonenumber") ?? "Info Not Found")
            setAssetId(localStorage.getItem("assetId") ?? "Info Not Found")
            setStatus(localStorage.getItem("status") ?? "Info Not Found")
        }

        loadFlightDeatils()
    }, []);

    const handleConnectClick = () => {
        peraWallet
        .connect()
        .then((newAccounts) => {
            peraWallet.connector?.on("disconnect", handleDisconnectWalletClick);
            setAccountAddress(newAccounts[0]);
            setIsConnected(true);
        })
        .catch((error) => {
            setIsConnected(false);
            console.log(error)
        });
    };

    function handleDisconnectWalletClick() {
        peraWallet.disconnect();
        setIsConnected(false);
        setAccountAddress("");
    }

    function convertUnixTimestampToString(timestampStr: string): string {
        // Convert the timestamp string to a number
        const timestamp = parseInt(timestampStr, 10);
    
        // Create a new Date object
        const date = new Date(timestamp);
    
        // Format the date to YYYY-MM-DD HH:mm:ss format
        const dateString = `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}T${padNumber(date.getHours())}:${padNumber(date.getMinutes())}:${padNumber(date.getSeconds())}`;
    
        return dateString;
    }
    
    function padNumber(num: number): string {
        return num.toString().padStart(2, '0');
    }

    const handleTicketsMouseEnter = () => {
        setShowDropdown(true);
    };

    const handleTicketsMouseLeave = () => {
        setShowDropdown(false);
    };

    const handleReceiver = (e: React.ChangeEvent<HTMLInputElement>) => {
        setReceiver(e.target.value)
    };

    async function handleSubmitTransfer() {
        if (receiver === "" || receiver === accountAddress) {
            setErrorMessage1(true)
        }
        else if (Date.now() > Date.parse(departureDate)){
            setErrorMessage2(true)
        }
        else {
            const algodToken = '';
            const algodServer = 'https://testnet-api.algonode.cloud';
            const algodClient = new algosdk.Algodv2(algodToken, algodServer);

            const appId = 679052496;
            const contract = new algosdk.ABIContract(abi);
            const atc = new algosdk.AtomicTransactionComposer();

            const suggestedParams = await algodClient.getTransactionParams().do();
            suggestedParams.flatFee = true;
            suggestedParams.fee = 2000;

            const assetTransfer = algosdk.makeAssetTransferTxnWithSuggestedParams(
                accountAddress,algosdk.getApplicationAddress(appId),undefined,
                undefined,1,undefined,Number(assetID),suggestedParams,undefined);
            
            atc.addMethodCall({
                appID: appId,
                method: algosdk.getMethodByName(contract.methods, 'sell_ticket'),
                sender: accountAddress,
                suggestedParams,
                note: new Uint8Array(Buffer.from("Method call fee")),
                signer,
                methodArgs: [
                    { txn: assetTransfer, signer },
                    confirmationNumber,
                    receiver,
                    false
                ],
                boxes: [
                    {
                        appIndex: appId,
                        name: new Uint8Array(Buffer.from(confirmationNumber))
                    }
                ],
                appForeignAssets: [
                    679052553
                ]
            });

            try {
                setToastMessage("Please launch Pera Wallet on your iOS or Android device to sign this method call transaction.");
                setShowToast(true);
                const results = await atc.execute(algodClient, 3);
                console.log(`Selling ticket ` + results.methodResults[0].returnValue);
                localStorage.removeItem("flightnumber")
                localStorage.removeItem("airline");
                localStorage.removeItem("seat");
                localStorage.removeItem("arrivalLoc")
                localStorage.removeItem("departureLoc");
                localStorage.removeItem("confirmation")
                localStorage.removeItem("price");
                localStorage.removeItem("firstname");
                localStorage.removeItem("lastname")
                localStorage.removeItem("phonenumber");
                localStorage.removeItem("assetId");
                localStorage.removeItem("status")
                localStorage.removeItem("ticketHolderAddress")
                localStorage.removeItem("departdate")
                localStorage.removeItem("arrivaldate")
                setShowToast(false);
                setShowPopup2(true);
            } catch (e) {
                console.log(e);
                setShowToast(false);
            }
        }
    }

    async function handleSubmitMarket() {
        if (receiver !== "") {
            setErrorMessage1(true)
        }
        else if (Date.now() > Date.parse(departureDate)){
            setErrorMessage2(true)
        }
        else {
            const algodToken = '';
            const algodServer = 'https://testnet-api.algonode.cloud';
            const algodClient = new algosdk.Algodv2(algodToken, algodServer);

            const appId = 679052496;
            const contract = new algosdk.ABIContract(abi);
            const atc = new algosdk.AtomicTransactionComposer();

            const suggestedParams = await algodClient.getTransactionParams().do();
            suggestedParams.flatFee = true;
            suggestedParams.fee = 2000;

            const assetTransfer = algosdk.makeAssetTransferTxnWithSuggestedParams(
                accountAddress,algosdk.getApplicationAddress(appId),undefined,
                undefined,1,undefined,Number(assetID),suggestedParams,undefined);
            
            atc.addMethodCall({
                appID: appId,
                method: algosdk.getMethodByName(contract.methods, 'sell_ticket'),
                sender: accountAddress,
                suggestedParams,
                note: new Uint8Array(Buffer.from("Method call fee")),
                signer,
                methodArgs: [
                    { txn: assetTransfer, signer },
                    confirmationNumber,
                    accountAddress,
                    true
                ],
                boxes: [
                    {
                        appIndex: appId,
                        name: new Uint8Array(Buffer.from(confirmationNumber))
                    }
                ],
                appForeignAssets: [
                    679052553
                ]
            });

            try {
                setToastMessage("Please launch Pera Wallet on your iOS or Android device to sign this method call transaction.");
                setShowToast(true);
                const results = await atc.execute(algodClient, 3);
                console.log(`Selling ticket to market` + results.methodResults[0].returnValue);
                localStorage.removeItem("flightnumber")
                localStorage.removeItem("airline");
                localStorage.removeItem("seat");
                localStorage.removeItem("arrivalLoc")
                localStorage.removeItem("departureLoc");
                localStorage.removeItem("confirmation")
                localStorage.removeItem("price");
                localStorage.removeItem("firstname");
                localStorage.removeItem("lastname")
                localStorage.removeItem("phonenumber");
                localStorage.removeItem("assetId");
                localStorage.removeItem("status")
                localStorage.removeItem("ticketHolderAddress")
                localStorage.removeItem("departdate")
                localStorage.removeItem("arrivaldate")
                setShowToast(false);
                setShowPopup(true);
            } catch (e) {
                console.log(e);
                setShowToast(false);
            }
        }
    }

    const handleLogoClick = () => {
        router.push("/");
    };

    const handleClosePopup = () => {
        setShowPopup(false);
        setErrorMessage1(false);
        setShowPopup2(false);
        setErrorMessage2(false);
        router.push("/transferTicket")
    };

    const handleClosePopup2 = () => {
        setShowPopup(false);
        setErrorMessage1(false);
        setShowPopup2(false);
        router.push("/")
    };

    async function signer(unsignedTxns: any[]) {
        const signerTransactions = unsignedTxns.map(txn => {
          return {txn, signers: [algosdk.encodeAddress(txn.from.publicKey)]}
        })
        return await peraWallet.signTransaction([signerTransactions])
      }
    return (
        <main className="flex min-h-screen flex-col items-center justify-between p-24">
            <nav className="fixed top-0 left-0 w-full bg-gradient-to-b from-zinc-200 backdrop-blur-2xl dark:bg-zinc-800/30 dark:from-inherit border-b border-gray-300 dark:border-neutral-800 p-4 flex justify-between items-center lg:rounded-xl lg:border lg:bg-gray-200 lg:dark:bg-zinc-800/30">
            <div onClick={handleLogoClick} className="flex items-center text-lg font-bold cursor-pointer">
                <Image
                    src="/logo.svg" // Ensure this path matches your file's location in the public directory
                    alt="TravelSmart Logo"
                    width={50}
                    height={50}
                    onClick={handleLogoClick}
                />
                <span className="ml-2">TravelSmart</span>
                </div>
                {isConnected ? (
                <div className="flex items-center space-x-4">
                    <button onClick={() => router.push("/marketplace")} className="px-4 py-2 bg-black text-white rounded hover:bg-white hover:text-black hover:border-black border transition-all">
                    Shop Marketplace
                    </button>
                    <div
                    className="relative"
                    onMouseEnter={handleTicketsMouseEnter}
                    >
                    <button onClick={() => router.push("/myTickets")} className="px-4 py-2 bg-black text-white rounded hover:bg-white hover:text-black hover:border-black border transition-all">
                        Profile
                    </button>
                    {showDropdown && (
                        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-800 rounded-lg shadow-lg border dark:border-neutral-800"
                        onMouseLeave={handleTicketsMouseLeave}
                        >
                        <a
                            href="/myTickets"
                            className="block px-4 py-2 text-black dark:text-white hover:bg-gray-100 dark:hover:bg-zinc-700"
                        >
                            Ticket Status
                        </a>
                        <a
                            href="/ticketsSoldToMe"
                            className="block px-4 py-2 text-black dark:text-white hover:bg-gray-100 dark:hover:bg-zinc-700"
                        >
                            Buy My Tickets
                        </a>
                        </div>
                    )}
                    </div>
                    <button onClick={handleDisconnectWalletClick} className="px-4 py-2 bg-black text-white rounded hover:bg-white hover:text-black hover:border-black border max-w-xs transition-all truncate">
                        {accountAddress}
                    </button>
                </div>
                ) : (
                <button
                    onClick={handleConnectClick}
                    className="px-4 py-2 bg-black text-white rounded hover:bg-white hover:text-black hover:border-black border transition-all"
                >
                    Connect Wallet
                </button>
                )}
            </nav>
            <div className="mt-2 text-center">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                    Sell your NFT Ticket to Market or Transfer It!
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                    Enter the wallet address of the person who you would like to sell this ticket to. If you are selling to market, leave that field blank
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                    If you enter a receiver address, only this receiver will be permitted to buy this ticket
                </p>
                <p className="text-sm text-red-600 dark:text-gray-300 mt-2">
                    NOTE: Selling or Tranferring your Ticket NFT is irreversible
                </p>
            </div>
            <form className="mt-7 bg-white dark:bg-zinc-800 shadow-lg rounded-lg p-9 w-full max-w-5xl">
                <div className="grid grid-cols-3 gap-4 border-2">
                    <div className="flex flex-col md:col-start-1 col-span-3">
                        <label className="mb-1 text-md font-medium text-gray-700 dark:text-white">
                            NFT Receiver*
                        </label>
                        <input
                            type="text"
                            className="input-box border-2 border-gray-300 p-2"
                            placeholder="e.g., XXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                            value={receiver}
                            onChange={handleReceiver}
                            style={{ height: '2rem' }}
                        />
                    </div>
                </div>
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col">
                        <label className="mb-1 text-md font-medium text-gray-700 dark:text-white">
                            NFT Status
                        </label>
                        <input
                            type="text"
                            className="input-box"
                            placeholder="e.g., LH1234"
                            readOnly={true}
                            disabled={true}
                            value={status.toUpperCase()}
                        />
                    </div>
                </div>
                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex flex-col">
                        <label className="mb-1 text-md font-medium text-gray-700 dark:text-white">
                            Flight Number #
                        </label>
                        <input
                            type="text"
                            className="input-box"
                            placeholder="e.g., LH1234"
                            readOnly={true}
                            disabled={true}
                            value={flightNumber}
                        />
                    </div>
                    <div className="flex flex-col">
                        <label className="mb-1 text-md font-medium text-gray-700 dark:text-white">
                            Airline Name
                        </label>
                        <input
                            type="text"
                            className="input-box"
                            readOnly={true}
                            disabled={true}
                            placeholder="e.g., Lufthansa"
                            value={airline}
                        />
                    </div>
                    <div className="flex flex-col">
                        <label className="mb-1 text-md font-medium text-gray-700 dark:text-white">
                            Seat Number
                        </label>
                        <input
                            type="text"
                            className="input-box"
                            readOnly={true}
                            disabled={true}
                            placeholder="e.g., 23A"
                            value={seatNumber}
                        />
                    </div>
                </div>
                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex flex-col">
                        <label className="mb-1 text-md font-medium text-gray-700 dark:text-white">
                            Ticket Price (ALGO)
                        </label>
                        <input
                            type="text"
                            className="input-box"
                            readOnly={true}
                            disabled={true}
                            placeholder="e.g., 350"
                            value={Number(ticketPrice) / 1000000}
                        />
                    </div>
                    <div className="flex flex-col">
                        <label className="mb-1 text-md font-medium text-gray-700 dark:text-white">
                            Confirmation Number
                        </label>
                        <input
                            type="text"
                            className="input-box"
                            readOnly={true}
                            disabled={true}
                            placeholder="e.g., ABC123456"
                            value={confirmationNumber}
                        />
                    </div>
                    <div className="flex flex-col">
                        <label className="mb-1 text-md font-medium text-gray-700 dark:text-white">
                            First Name
                        </label>
                        <input
                            type="text"
                            className="input-box"
                            placeholder="e.g., John"
                            value={firstName}
                            readOnly={true}
                            disabled={true}
                        />
                    </div>
                </div>
                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex flex-col">
                        <label className="mb-1 text-md font-medium text-gray-700 dark:text-white">
                            Departure Location
                        </label>
                        <input
                            type="text"
                            className="input-box"
                            readOnly={true}
                            disabled={true}
                            placeholder="e.g., New York"
                            value={departureLocation}
                        />
                    </div>
                    <div className="flex flex-col">
                        <label className="mb-1 text-md font-medium text-gray-700 dark:text-white">
                            Arrival Destination
                        </label>
                        <input
                            type="text"
                            className="input-box"
                            readOnly={true}
                            disabled={true}
                            placeholder="e.g., London"
                            value={arrivalDestination}
                        />
                    </div>
                    <div className="flex flex-col">
                        <label className="mb-1 text-md font-medium text-gray-700 dark:text-white">
                            Last Name
                        </label>
                        <input
                            type="text"
                            className="input-box"
                            placeholder="e.g., Doe"
                            value={lastName}
                            readOnly={true}
                            disabled={true}
                        />
                    </div>
                </div>
                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex flex-col">
                        <label className="mb-1 text-md font-medium text-gray-700 dark:text-white">
                            Departure Time
                        </label>
                        <input
                            type="text"
                            className="input-box"
                            placeholder="e.g., 1700000000"
                            readOnly={true}
                            disabled={true}
                            value={departureDate}
                        />
                    </div>
                    <div className="flex flex-col">
                        <label className="mb-1 text-md font-medium text-gray-700 dark:text-white">
                            Arrival Time
                        </label>
                        <input
                            type="text"
                            className="input-box"
                            placeholder="e.g., 1700001000"
                            readOnly={true}
                            disabled={true}
                            value={arrivalDate}
                        />
                    </div>
                    <div className="flex flex-col">
                        <label className="mb-1 text-md font-medium text-gray-700 dark:text-white">
                            Phone Number
                        </label>
                        <input
                            type="text"
                            className="input-box"
                            placeholder="e.g., +1234567890"
                            value={phoneNumber}
                            readOnly={true}
                            disabled={true}
                        />
                    </div>
                </div>
                <div className="flex justify-between mt-6">
                    <button
                        type="button"
                        onClick={handleSubmitMarket}
                        className="px-4 py-2 bg-black text-white rounded hover:bg-white hover:text-black hover:border-black border transition-all"
                    >
                        Sell to Market
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmitTransfer}
                        className="px-4 py-2 bg-green-700 text-white rounded hover:bg-white hover:text-black hover:border-black border transition-all"
                    >
                        Transfer to Receiver
                    </button>
                </div>
            </form>
            {errorMessage1 && (
                <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50">
                <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 shadow-lg border dark:border-neutral-800">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        Something went wrong...
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300 mt-2">
                        Please make sure if your have chosen the correct transfer method. If you want to sell to market, leave NFT receiver blank
                    </p>
                    <p className="text-gray-700 dark:text-gray-300 mt-2">
                        If you would like to transfer ticket to another person, please enter the wallet address of that person in "NFT Recevier"
                    </p>
                    <button
                    onClick={handleClosePopup}
                    className="mt-4 px-4 py-2 bg-black text-white rounded hover:bg-white hover:text-black hover:border-black border transition-all"
                    >
                    Close
                    </button>
                </div>
                </div>
            )}
            {errorMessage2 && (
                <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50">
                <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 shadow-lg border dark:border-neutral-800">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        Expired Ticket...
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300 mt-2">
                        The departure date on your ticket has already passed
                    </p>
                    <button
                    onClick={handleClosePopup}
                    className="mt-4 px-4 py-2 bg-black text-white rounded hover:bg-white hover:text-black hover:border-black border transition-all"
                    >
                    Close
                    </button>
                </div>
                </div>
            )}
            {showPopup2 && (
                <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50">
                <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 shadow-lg border dark:border-neutral-800">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        Success!
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300 mt-2">
                        Ticket sale in process. You will now have to wait for your receiver to buy your ticket
                    </p>
                    <button
                    onClick={handleClosePopup2}
                    className="mt-4 px-4 py-2 bg-black text-white rounded hover:bg-white hover:text-black hover:border-black border transition-all"
                    >
                    Close
                    </button>
                </div>
                </div>
            )}
            {showPopup && (
                <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50">
                <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 shadow-lg border dark:border-neutral-800">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        Success!
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300 mt-2">
                        Ticket sale in process. You will now have to wait for another person in the market to buy your ticket
                    </p>
                    <p className="text-gray-700 dark:text-gray-300 mt-2">
                        You can check ticket status anytime by going to Profile and clicking on Ticket Status
                    </p>
                    <button
                    onClick={handleClosePopup2}
                    className="mt-4 px-4 py-2 bg-black text-white rounded hover:bg-white hover:text-black hover:border-black border transition-all"
                    >
                    Close
                    </button>
                </div>
                </div>
            )}
            {showToast && (
                <div className="toast-container">
                <div className="toast-icon tap-animation">
                    <Image
                    src="/phone-icon.svg"
                    alt="Phone Icon"
                    width={100}
                    height={200} // Adjust size as needed
                    className="phone-icon"
                    />
                </div>
                <div className="toast-message">
                    {toastMessage}
                </div>
                </div>
            )}
        </main>
    )
}