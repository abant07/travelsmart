"use client"
import { useRouter } from 'next/navigation';
import React from "react";
import * as algosdk from "algosdk"
import Image from "next/image";
import {PeraWalletConnect} from "@perawallet/connect"
import abi from "../../../components/abi.json"

const peraWallet = new PeraWalletConnect({
    shouldShowSignTxnToast: false
});

export default function Market() {
    const [isConnected, setIsConnected] = React.useState(false);
    const [showDropdown, setShowDropdown] = React.useState(false);
    const [accountAddress, setAccountAddress] = React.useState("");
    const [showPopup, setShowPopup] = React.useState(false);
    const [showPopup2, setShowPopup2] = React.useState(false);
    const [showPopup3, setShowPopup3] = React.useState(false);
    const [showError, setShowError] = React.useState(false);
    const [viewFlightDisabled, setViewFlightDisabled] = React.useState(true);
    const [confirmationCode, setFilter1] = React.useState('');
    const [flightNumber, setFilter2] = React.useState('');
    const [firstname, setFirstname] = React.useState("");
    const [lastname, setLastname] = React.useState("");
    const [phoneNumber, setPhoneNumber] = React.useState("");
    const [airlineName, setAirlineName] = React.useState('');
    const [departureDate, setDepartureDate] = React.useState('');
    const [arrivalDate, setArrivalDate] = React.useState('');
    const [departureLocation, setDepartureLocation] = React.useState('');
    const [arrivalLocation, setArrivalLocation] = React.useState('');
    const [resultsPerPage, setResultsPerPage] = React.useState('10');
    const [maxPrice, setMaxPrice] = React.useState('');
    const [leftDateBound, setLeftDateBound] = React.useState(0);
    const [rightDateBound, setRightDateBound] = React.useState(0);
    const [selectedTicket, setSelectedTicket] = React.useState('');
    const [confirmationNumber, setConfirmation] = React.useState("");
    const [price, setPrice] = React.useState("");
    const [sender, setSender] = React.useState("");
    const [assetID, setAssetId] = React.useState("");

    const [showToast, setShowToast] = React.useState(false);
    const [toastMessage, setToastMessage] = React.useState("");
    const [decodedValues, setDecodedValues] = React.useState([]);
    const router = useRouter();

    React.useEffect(() => {
        // Reconnect to the session when the component is mounted
        peraWallet.reconnectSession().then((accounts) => {
            peraWallet.connector?.on("disconnect", handleDisconnectWalletClick);
            if (peraWallet.isConnected && accounts.length) {
                setAccountAddress(accounts[0]);
                setIsConnected(true);
                getTicketInfo(accounts[0])
            }
        });

        const getTicketInfo = async (account: string) => {
        const algodToken = '';
        const algodServer = 'https://testnet-api.algonode.cloud';
        const algodClient = new algosdk.Algodv2(algodToken, algodServer);
    
        const appId = 679052496;
        const boxesResponse = await algodClient.getApplicationBoxes(appId).do();
        const boxNames = boxesResponse.boxes.map(box => box.name);
        var decode = []
        var allDecodedValues = [];
    
        for (let i = 0; i < boxNames.length; i++) {
            const boxInformation = await algodClient.getApplicationBoxByName(appId, boxNames[i]).do();
            var string = new TextDecoder().decode(boxNames[i]);
            const boxValue = boxInformation.value
            const decodedBoxValue = algosdk.ABIType.from('(string,uint64,uint64,string,uint64,string,string,uint64,string,string,string,address,address,string)').decode(new Uint8Array(Buffer.from(boxValue)))
            
            decode = []

            if (decodedBoxValue[11] != account && decodedBoxValue[13] == "market") {
                decode.push(string)
                decode.push(decodedBoxValue[0])
                decode.push(String(Number(decodedBoxValue[1])))
                decode.push(String(Number(decodedBoxValue[2])))
                decode.push(decodedBoxValue[3])
                decode.push(convertUnixTimestampToString(String(Number(decodedBoxValue[4]))))
                decode.push(decodedBoxValue[5])
                decode.push(decodedBoxValue[6])
                decode.push(convertUnixTimestampToString(String(Number(decodedBoxValue[7]))))
                decode.push(decodedBoxValue[11])
                allDecodedValues.push(decode);
            }
        
        }
        
            setDecodedValues(allDecodedValues);
        }
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
        const timestamp = parseInt(timestampStr, 10);
        const date = new Date(timestamp);
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

    const handleLogoClick = () => {
        router.push("/");
    };

    const handleClosePopup = () => {
        setShowPopup(false);
        setShowPopup2(false);
        setShowError(false)
        router.push("/marketplace")
    };
    
    const handleFirstNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFirstname(e.target.value);
        checkFormCompletion(e.target.value, lastname, phoneNumber);
      };
    
    const handleLastNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLastname(e.target.value);
        checkFormCompletion(firstname, e.target.value, phoneNumber);
    };

    const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPhoneNumber(e.target.value);
        checkFormCompletion(firstname, lastname, e.target.value);
    };

    const handleDepartureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setDepartureDate(e.target.value);
        calculateUnixTime(e.target.value, arrivalDate);
    };

    const handleArrivalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setArrivalDate(e.target.value);
        calculateUnixTime(departureDate, e.target.value);
    };

    const calculateUnixTime = (departure: string, arrival: string) => {
        const leftBound = departure ? new Date(departure).getTime() : 0;
        const rightBound = arrival ? new Date(arrival).getTime() : Date.now();
        setLeftDateBound(leftBound);
        setRightDateBound(rightBound);
    };

    const checkFormCompletion = (firstname: string, lastname: string, phonenumber: string) => {
        if (firstname.length > 0 && lastname.length > 0 && phonenumber.length > 0) {
            setViewFlightDisabled(false);
        }
        else {
            setViewFlightDisabled(true);
        }
    };

    const buyTicket = async (confirmationNumber: string, sender: string, price: string, assetID: string) => {
        const algodToken = '';
        const algodServer = 'https://testnet-api.algonode.cloud';
        const algodClient = new algosdk.Algodv2(algodToken, algodServer);

        const appId = 679052496;
        const contract = new algosdk.ABIContract(abi);
        const atc = new algosdk.AtomicTransactionComposer();

        const suggestedParams = await algodClient.getTransactionParams().do();

        const boxesResponse = await algodClient.getApplicationBoxes(appId).do();
        const boxNames = boxesResponse.boxes.map(box => box.name);
        var needToOptIn = false

        var sellerAddress = "" 
        var sellerFirstName = ""
        var sellerLastName = ""
        var sellerPhone = ""
    
        for (let i = 0; i < boxNames.length; i++) {
            const boxInformation = await algodClient.getApplicationBoxByName(appId, boxNames[i]).do();
            const boxValue = boxInformation.value
            const decodedBoxValue = algosdk.ABIType.from('(string,uint64,uint64,string,uint64,string,string,uint64,string,string,string,address,address,string)').decode(new Uint8Array(Buffer.from(boxValue)))
            
            var string = new TextDecoder().decode(boxNames[i]);
            if (string == confirmationNumber) { 
                sellerFirstName = decodedBoxValue[8]
                sellerLastName = decodedBoxValue[9]
                sellerPhone = decodedBoxValue[10]
                sellerAddress = decodedBoxValue[11]
                try {
                    await algodClient.accountAssetInformation(accountAddress, Number(679052553)).do()
                }
                catch {
                    needToOptIn = true
                    console.log("no asset")
                }
                break
            }
        }
        
        if (needToOptIn) {
            let opttxn = algosdk.makeAssetTransferTxnWithSuggestedParams(accountAddress,accountAddress,undefined,undefined,0,new Uint8Array(Buffer.from("Asset opt in")),Number(assetID),suggestedParams,undefined);
        
            const singleTxnGroups = [{txn: opttxn, signers: [accountAddress]}];

            try {
                setToastMessage("Please launch Pera Wallet on your iOS or Android device to sign this asset opt in transaction. You will sign a method call txn after");
                setShowToast(true);
                const signedTxn = await peraWallet.signTransaction([singleTxnGroups]);
                const {txId} = await algodClient.sendRawTransaction(signedTxn).do();
                const confirmedAssetCreateTxn = await algosdk.waitForConfirmation(algodClient, txId, 3);
                setShowToast(false);
            } catch (error) {
                console.log("Couldn't sign asset creation", error);
                setShowToast(false);
                setShowError(true)
            }
        }

        suggestedParams.flatFee = true;
        suggestedParams.fee = 2000;

        const paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
            from: accountAddress,
            suggestedParams: suggestedParams,
            to: sender,
            amount: BigInt(Number(price)),
            note: new Uint8Array(Buffer.from("Payment for ticket"))
        });

        const company = "PPHP75VJPEZ3HJCOKFLRN2ZZU2PBADIMRXA2MUOFPFKBHA22NUCQDDJQ4I"
        const airline = "N4VOP666YZSMKOXOYTSAGY7WJI2CRYJVODP55R7BDHPY2RPMTARUEZCWYE"

        const transactionFee = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
            from: accountAddress,
            suggestedParams: suggestedParams,
            to: company,
            amount: BigInt(Number(Math.round(Number(price) * 0.15))),
            note: new Uint8Array(Buffer.from("Transaction fee to company"))
        });

        const airlineFee = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
            from: accountAddress,
            suggestedParams: suggestedParams,
            to: airline,
            amount: BigInt(Number(Math.round(Number(price) * 0.10))),
            note: new Uint8Array(Buffer.from("Transaction fee to airline"))
        });


        atc.addMethodCall({
            appID: appId,
            method: algosdk.getMethodByName(contract.methods, 'buy_ticket'),
            sender: accountAddress,
            suggestedParams,
            note: new Uint8Array(Buffer.from("Method call fee")),
            signer,
            methodArgs: [
                { txn: paymentTxn, signer },
                { txn: transactionFee, signer },
                { txn: airlineFee, signer },
                Number(assetID),
                confirmationNumber,
                firstname,
                lastname,
                phoneNumber
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
            console.log(`Buying ticket ` + results.methodResults[0].returnValue);
            setShowToast(false);
            setShowPopup2(true);
            await fetch(`/api/update?newCode=${confirmationNumber}&newFname=${firstname}&newLname=${lastname}&newPhone=${phoneNumber}`, { method: 'POST' });
            await fetch(`/api/txns?walletAddress=${encodeURIComponent(accountAddress)}&transactionType=market&seller=${encodeURIComponent(sellerAddress)}&txnId=${encodeURIComponent(JSON.stringify(results.txIDs))}&transactionTime=${encodeURIComponent(new Date().toISOString())}&sellerName=${encodeURIComponent(sellerFirstName + " " + sellerLastName)}&sellerPhone=${encodeURIComponent(sellerPhone)}&buyerName=${encodeURIComponent(lastname)}&buyerPhone=${encodeURIComponent(phoneNumber)}&flightConfirmationNumber=${encodeURIComponent(confirmationNumber)}`, { method: 'POST' });
        } catch (e) {
            console.log(e);
            setShowToast(false);
            setShowError(true)
        }
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
                    Global Marketplace
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                    View and buy tickets from sellers around the world!
                </p>
            </div>
            <div className="mt-4 w-full max-w-lg space-y-4">
                <input
                    type="text"
                    placeholder="Filter by Confirmation Code"
                    value={confirmationCode}
                    onChange={(e) => setFilter1(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded dark:bg-zinc-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                    type="text"
                    placeholder="Filter by Flight Number"
                    value={flightNumber}
                    onChange={(e) => setFilter2(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded dark:bg-zinc-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                    type="text"
                    placeholder="Airline Name"
                    value={airlineName}
                    onChange={(e) => setAirlineName(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded dark:bg-zinc-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex space-x-2">
                    <label>Dates Between</label>
                    <input
                        type="date"
                        value={departureDate}
                        onChange={handleDepartureChange}
                        className="p-2 border border-gray-300 rounded dark:bg-zinc-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <label> to: </label>
                    <input
                        type="date"
                        value={arrivalDate}
                        onChange={handleArrivalChange}
                        className="p-2 border border-gray-300 rounded dark:bg-zinc-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <input
                    type="text"
                    placeholder="Departure Location"
                    value={departureLocation}
                    onChange={(e) => setDepartureLocation(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded dark:bg-zinc-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                    type="text"
                    placeholder="Arrival Location"
                    value={arrivalLocation}
                    onChange={(e) => setArrivalLocation(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded dark:bg-zinc-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex space-x-2">
                    <input
                        type="text"
                        placeholder="Max Price (ALGO)"
                        value={maxPrice}
                        onChange={(e) => {setMaxPrice(e.target.value)
                        }}
                        className="p-2 border border-gray-300 rounded dark:bg-zinc-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <select
                        value={resultsPerPage}
                        onChange={(e) => setResultsPerPage(e.target.value)}
                        className="p-2 border border-gray-300 rounded dark:bg-zinc-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {[...Array(30).keys()].map((num) => (
                            <option key={num + 1} value={num + 1}>
                                {num + 1} Results
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="mb-32 mt-20 grid gap-10 text-center lg:w-full lg:max-w-6xl lg:grid-cols-3 lg:text-left justify-items-center">
                {decodedValues.filter(value =>
                    (!confirmationCode || String(value[0]).toLowerCase().includes(confirmationCode.toLowerCase())) &&
                    (!flightNumber || String(value[2]).toLowerCase().includes(flightNumber.toLowerCase())) &&
                    (!airlineName || String(value[1]).toLowerCase().includes(airlineName.toLowerCase())) &&
                    (!departureLocation || String(value[6]).toLowerCase().includes(departureLocation.toLowerCase())) &&
                    (!arrivalLocation || String(value[7]).toLowerCase().includes(arrivalLocation.toLowerCase())) &&
                    (!maxPrice || ((value[3] / 1000000) < Number(maxPrice))) &&
                    (leftDateBound === 0 || rightDateBound === Date.now() || 
                        (leftDateBound <= Date.parse(value[5]) && rightDateBound >= Date.parse(value[8]))) &&
                    (Date.now() < Date.parse(value[5]))
                )   
                .slice(0, Number(resultsPerPage.substring(0, 2).trim()))
                .map((value, index) => (
                    <div key={index} className="relative w-60 h-60 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl transform rotate-45 overflow-hidden transition-all duration-300 hover:from-green-400 hover:to-blue-500">
                        <div className="absolute -rotate-45 inset-0 flex flex-col items-center justify-center text-white">
                            <div onClick={() => {setShowPopup(true)
                                    setSelectedTicket(value[0])
                                }} className="flex justify-center cursor-pointer items-center w-full">
                                <Image src="/airplane.svg" alt="Airplane" width={50} height={50} />
                            </div>
                            <div className="mt-4 text-center">
                                <p  onClick={() => {setShowPopup(true)
                                    setSelectedTicket(value[0])
                                }} className="text-sm cursor-pointer font-bold">{value[0]}</p>
                                <p onClick={() => {setShowPopup(true)
                                    setSelectedTicket(value[0])
                                }} className="text-xs cursor-pointer">Airline: {value[1]}</p>
                                <p onClick={() => {setShowPopup(true)
                                    setSelectedTicket(value[0])
                                }} className="text-xs cursor-pointer">Flight Number #: {value[2]}</p>
                                <button onClick={() => {
                                    setShowPopup3(true);
                                    setConfirmation(value[0])
                                    setSender(value[9])
                                    setPrice(value[3])
                                    setAssetId("679052553")
                                }}
                                className="mt-2 px-7 py-2 bg-green-500 border-white border-2 rounded-full text-white transition-all duration-300 hover:bg-white hover:text-black">
                                    Buy
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {showPopup && (
                <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50">
                <div className="bg-white dark:bg-zinc-800 rounded-lg p-8 shadow-lg border dark:border-neutral-800 w-full max-w-md mx-4">
                    <div className="flex flex-col items-center">
                    <Image src="/airplane.svg" alt="Plane" width={64} height={64} className="mb-4" />
                    {decodedValues.filter(value => value[0] === selectedTicket).map((value, index) => (
                        <div key={index} className="w-full">
                        <h3 className="text-lg text-center font-semibold text-gray-900 dark:text-gray-100 mb-4">
                            Ticket Information
                        </h3>
                        <div className="text-gray-700 dark:text-gray-300 mb-4">
                            <p><strong>Airline Name:</strong> {value[1]}</p>
                            <p><strong>Flight Number #:</strong> {value[2]}</p>
                            <p><strong>Ticket Price (ALGO):</strong> {Number(value[3]) / 1000000}</p>
                            <p><strong>Seat Number:</strong> {value[4]}</p>
                            <p><strong>Departure Location:</strong> {value[6]}</p>
                            <p><strong>Arrival Location:</strong> {value[7]}</p>
                            <p><strong>Departure Time:</strong> {value[5]}</p>
                            <p><strong>Arrival Time:</strong> {value[8]}</p>
                        </div>
                        <button
                            onClick={handleClosePopup}
                            className="mt-4 w-full px-4 py-2 bg-black text-white rounded hover:bg-white hover:text-black hover:border-black border transition-all"
                        >
                            Close
                        </button>
                        </div>
                    ))}
                    </div>
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
                        Ticket Bought. You can now view this ticket in your Profile under "Ticket Status"
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
                        Something went wrong...
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300 mt-2">
                        Payment failed, please make sure you have enough balance
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

            {showPopup3 && (
                <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50">
                    <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 shadow-lg border dark:border-neutral-800 relative">
                        <button
                            onClick={() => setShowPopup3(false)}
                            className="absolute top-2 right-2 p-2 rounded-full bg-gray-200 dark:bg-zinc-700 hover:bg-gray-300 dark:hover:bg-zinc-600 transition"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-6 w-6 text-gray-900 dark:text-gray-100"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        <h3 className="text-lg text-center font-semibold text-gray-900 dark:text-gray-100">
                            Enter your information
                        </h3>
                        <div className="mt-4 w-full max-w-lg">
                            <input
                                type="text"
                                placeholder="Enter your first name"
                                value={firstname}
                                onChange={handleFirstNameChange}
                                className="w-full p-2 mb-4 border border-gray-300 rounded dark:bg-zinc-700 dark:text-white"
                            />
                            <input
                                type="text"
                                placeholder="Enter your last name"
                                value={lastname}
                                onChange={handleLastNameChange}
                                className="w-full p-2 mb-4 border border-gray-300 rounded dark:bg-zinc-700 dark:text-white"
                            />
                            <input
                                type="text"
                                placeholder="Enter your phone number"
                                value={phoneNumber}
                                onChange={handlePhoneNumberChange}
                                className="w-full p-2 mb-4 border border-gray-300 rounded dark:bg-zinc-700 dark:text-white"
                            />
                        </div>
                        <button
                            onClick={() => {
                                setShowPopup3(false)
                                buyTicket(confirmationNumber, sender, price, assetID)
                            }}
                            disabled={viewFlightDisabled}
                            className={`mt-4 w-full ${viewFlightDisabled ? "opacity-50 cursor-not-allowed" : "hover:bg-green-500 hover:text-white hover:border-white border transition-all"} px-4 py-2 bg-black text-white rounded`}
                        >
                            Buy
                        </button>
                    </div>
                </div>
            )}
      </main>
    )
}