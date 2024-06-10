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

export default function Ticket() { 
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
    const [showPopup, setShowPopup] = React.useState(false);
    const [accountAddress, setAccountAddress] = React.useState("");
    const [showToast, setShowToast] = React.useState(false);
    const [showError, setShowError] = React.useState(false);
    const [toastMessage, setToastMessage] = React.useState("");
    const router = useRouter();

    React.useEffect(() => {
        // Reconnect to the session when the component is mounted
        peraWallet.reconnectSession().then((accounts) => {
            peraWallet.connector?.on("disconnect", handleDisconnectWalletClick);
            if (peraWallet.isConnected && accounts.length) {
                setAccountAddress(accounts[0]);
                setIsConnected(true);
            }
        })

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

    function handleDisconnectWalletClick() {
        peraWallet.disconnect();
        setIsConnected(false);
        setAccountAddress("");
    }

    const handleTicketsMouseEnter = () => {
        setShowDropdown(true);
    };

    const handleTicketsMouseLeave = () => {
        setShowDropdown(false);
    };

    async function handleSubmit() {
        if (Date.now() < Date.parse(departureDate)) {
            const algodToken = '';
            const algodServer = 'https://testnet-api.algonode.cloud';
            const algodClient = new algosdk.Algodv2(algodToken, algodServer);
        
            const appId = 679052496;
            const contract = new algosdk.ABIContract(abi);
            const atc = new algosdk.AtomicTransactionComposer();

            const suggestedParams = await algodClient.getTransactionParams().do();
            var needToOptIn = false

            try {
                await algodClient.accountAssetInformation(accountAddress, 679052553).do()
            }
            catch {
                needToOptIn = true
                console.log("no asset")
            }
            
            if (needToOptIn) {
                let opttxn = algosdk.makeAssetTransferTxnWithSuggestedParams(accountAddress,accountAddress,undefined,undefined,0, new Uint8Array(Buffer.from("Asset opt in")),679052553,suggestedParams,undefined);
        
                const singleTxnGroups = [{txn: opttxn, signers: [accountAddress]}];

                try {
                    setToastMessage("Please launch Pera Wallet on your iOS or Android device to sign this one time asset opt in transaction. You will sign a method call txn after");
                    setShowToast(true);
                    const signedTxn = await peraWallet.signTransaction([singleTxnGroups]);
                    const {txId} = await algodClient.sendRawTransaction(signedTxn).do();
                    await algosdk.waitForConfirmation(algodClient, txId, 3);
                    setShowToast(false);
                } catch (error) {
                    console.log("Couldn't sign asset opt in", error);
                    setShowToast(false);
                }
            }

            const boxFee = 500000;
            suggestedParams.flatFee = true;
            suggestedParams.fee = 2000;
            
            const paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
                from: accountAddress,
                suggestedParams: suggestedParams,
                to: algosdk.getApplicationAddress(appId),
                amount: boxFee,
                note: new Uint8Array(Buffer.from("Payment for box fee"))
            });
        
            // Add method call to AtomicTransactionComposer
            atc.addMethodCall({
                appID: appId,
                method: algosdk.getMethodByName(contract.methods, 'create_ticket'),
                sender: accountAddress,
                suggestedParams,
                note: new Uint8Array(Buffer.from("Method call fee")),
                signer,
                methodArgs: [
                    { txn: paymentTxn, signer },
                    confirmationNumber,
                    BigInt(679052553),
                    firstName,
                    lastName,
                    phoneNumber,
                    airline,
                    BigInt(flightNumber),
                    BigInt((Number(ticketPrice))),
                    seatNumber,
                    BigInt(Date.parse(departureDate)),
                    BigInt(Date.parse(arrivalDate)),
                    departureLocation,
                    arrivalDestination
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
                console.log(`Contract created ` + results.methodResults[0].returnValue);
                localStorage.setItem("assetId", String(679052553))
                localStorage.setItem("status", "created");
                localStorage.setItem("ticketHolderAddress", accountAddress);
                setShowToast(false);
                setShowPopup(true);
            } catch (e) {
                console.log(e);
                setShowToast(false);
            }
        }
        else {
            setShowError(true);
        }

    };
    
    async function signer(unsignedTxns: any[]) {
        const signerTransactions = unsignedTxns.map(txn => {
          return {txn, signers: [algosdk.encodeAddress(txn.from.publicKey)]}
        })
        return await peraWallet.signTransaction([signerTransactions])
      }
        

    const handleLogoClick = () => {
        router.push("/");
    };

    const handleClosePopup = () => {
        setShowPopup(false);
        router.push("/transferTicket")
    };

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
            <div className="mt-8 text-center">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                Create your NFT ticket!
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                    Double check that your flight information is correct, if so, click "Create Ticket NFT" to start selling your ticket
                </p>
                <p className="text-sm text-red-600 dark:text-gray-300 mt-2">
                    NOTE: Creating your NFT is irreversible
                </p>
            </div>
          <form className="mt-7 bg-white dark:bg-zinc-800 shadow-lg rounded-lg p-9 w-full max-w-5xl">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <div className="flex justify-end mt-6">
                    <button
                        type="button"
                        onClick={handleSubmit}
                        className="px-4 py-2 bg-black text-white rounded hover:bg-white hover:text-black hover:border-black border transition-all"
                    >
                        Create Ticket NFT
                    </button>
                </div>
            </form>
            {showPopup && (
                <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50">
                <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 shadow-lg border dark:border-neutral-800">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        Success!
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300 mt-2">
                        Ticket Created. You can now sell this ticket in the marketplace or to someone else
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
            {showError && (
                <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50">
                <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 shadow-lg border dark:border-neutral-800">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        Expired Ticket
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300 mt-2">
                        The departure date on your ticket has already passed.
                    </p>
                    <button
                    onClick={() => setShowError(false)}
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
      );
}