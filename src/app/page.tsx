"use client"
import { useRouter } from 'next/navigation';
import React from "react";
import Image from 'next/image';
import * as algosdk from "algosdk"
import {motion} from "framer-motion"
import {PeraWalletConnect} from "@perawallet/connect"

const peraWallet = new PeraWalletConnect();
export default function Home() {
  const [isConnected, setIsConnected] = React.useState(false);
  const [showDropdown, setShowDropdown] = React.useState(false);
  const [confirmationCode, setConfirmationCode] = React.useState("");
  const [airline, setAirline] = React.useState("Select");
  const [ticketPurchaseId, setTicketPurchaseId] = React.useState("");
  const [viewFlightDisabled, setViewFlightDisabled] = React.useState(true);
  const [showPopup, setShowPopup] = React.useState(false);
  const [ownerPopup, setOwnerPopup] = React.useState(false);
  const [saleProgress, setSaleProgress] = React.useState(false);
  const [accountAddress, setAccountAddress] = React.useState("");
  const [existingTicket, setExistingTicket] = React.useState(true);
  const [warning, showWarning] = React.useState(false);
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
        // You MUST handle the reject because once the user closes the modal, peraWallet.connect() promise will be rejected.
        // For the async/await syntax you MUST use try/catch
        setIsConnected(false);
        console.log(error)
      });
  };

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

  const handleConfirmationCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmationCode(e.target.value);
    checkFormCompletion(existingTicket, e.target.value, airline, ticketPurchaseId);
  };

  const handleAirlineChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setAirline(e.target.value);
    checkFormCompletion(existingTicket, confirmationCode, e.target.value, ticketPurchaseId);
  };

  const handleTicketPurchaseIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTicketPurchaseId(e.target.value);
    checkFormCompletion(existingTicket, confirmationCode, airline, e.target.value);
  };

  const checkFormCompletion = (existingTicket: boolean, confirmationCode: string, airline: string, ticketPurchaseId: string) => {
    if (existingTicket == false && confirmationCode.length == 6) {
      setViewFlightDisabled(false);
    }
    else if (existingTicket == true && confirmationCode.length == 6 && airline !== 'Select' && ticketPurchaseId.length === 4) {
      setViewFlightDisabled(false);
    }
    else {
      setViewFlightDisabled(true);
    }
  };

  const handleClosePopup = () => {
    setShowPopup(false);
    setOwnerPopup(false);
    showWarning(false)
    setSaleProgress(false);
  };

  const handleViewFlightClick = async () => {
    console.log("View Flight Clicked");
    const algodToken = '';
		const algodServer = 'https://testnet-api.algonode.cloud';
    const algodClient = new algosdk.Algodv2(algodToken, algodServer);

    const appId = 679052496;
    const boxesResponse = await algodClient.getApplicationBoxes(appId).do();
    const boxNames = boxesResponse.boxes.map(box => box.name);

    var foundExistingTicket = false;
    var showError = true;
    var showOwnerError = false;
    var saleInProgress = false

    
    for (let i = 0; i < boxNames.length; i++) {
      var string = new TextDecoder().decode(boxNames[i]);
      if (string == confirmationCode) {
        foundExistingTicket = true;
        const boxInformation = await algodClient.getApplicationBoxByName(appId, boxNames[i]).do();
        const boxValue = boxInformation.value
        const decodedBoxValue = algosdk.ABIType.from('(string,uint64,uint64,string,uint64,string,string,uint64,string,string,string,address,address,string)').decode(new Uint8Array(Buffer.from(boxValue)))

        if (decodedBoxValue[11] == accountAddress) {
          if (decodedBoxValue[13] == "transfer" || decodedBoxValue[13] == "market"){
            saleInProgress = true
          }
          else {
            localStorage.setItem("confirmation", confirmationCode);
            localStorage.setItem("assetId", String(679052553));
            localStorage.setItem("airline", decodedBoxValue[0]);
            localStorage.setItem("flightnumber", String(Number(decodedBoxValue[1])));
            localStorage.setItem("price", String(Number(decodedBoxValue[2])));
            localStorage.setItem("seat", decodedBoxValue[3]);
            localStorage.setItem("departdate", String(Number(decodedBoxValue[4])));
            localStorage.setItem("departureLoc", decodedBoxValue[5]);
            localStorage.setItem("arrivalLoc", decodedBoxValue[6]);
            localStorage.setItem("arrivaldate", String(Number(decodedBoxValue[7])));
            localStorage.setItem("firstname", decodedBoxValue[8]);
            localStorage.setItem("lastname", decodedBoxValue[9]);
            localStorage.setItem("phonenumber", decodedBoxValue[10]);
            localStorage.setItem("ticketHolderAddress", decodedBoxValue[11]);
            localStorage.setItem("status", decodedBoxValue[13]);
          }
        }
        else {
          showOwnerError = true
        }
        break;
      }
    }

    if (!foundExistingTicket) {
      try {
        const response = await fetch('/api');
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }
        const result = await response.json();
        for (let i = 0; i < result.length; i++) {
          if (result[i][4] == confirmationCode && result[i][5].substring(12) == ticketPurchaseId && result[i][7] == airline) {
            showError = false;
            localStorage.setItem("firstname", result[i][0]);
            localStorage.setItem("lastname", result[i][1]);
            localStorage.setItem("phonenumber", result[i][2]);
            localStorage.setItem("seat", result[i][3]);
            localStorage.setItem("confirmation", result[i][4]);
            localStorage.setItem("price", String(Number(result[i][6]) * 5952380));
            localStorage.setItem("airline", result[i][7]);
            localStorage.setItem("flightnumber", result[i][8]);
            localStorage.setItem("departureLoc", result[i][9]);
            localStorage.setItem("arrivalLoc", result[i][10]);
            localStorage.setItem("departdate", String(Date.parse(result[i][11])));
            localStorage.setItem("arrivaldate", String(Date.parse(result[i][12])));
            break;
          }
        }

        if (showError) {
          setShowPopup(true);
        }
        else {
          router.push("/newTicket");
        }
      } catch (error) {
        console.log(error)
      }
    }
    else {
      if (saleInProgress) {
        setSaleProgress(true);
      }
      else if (showOwnerError) {
        setOwnerPopup(true);
      }
      else if (existingTicket == true) {
        showWarning(true)
      }
      else {
        router.push("/transferTicket");
      }
    }
  };

  const handleLogoClick = () => {
    router.push("/");
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
          Welcome to TravelSmart!
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
          A decentralized 3rd party airline ticket purchasing service to help buy, transfer, and sell your airline tickets
        </p>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-10">
            Start Here
        </h2>
        <div className="mt-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 mx-auto"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-10">
            Enter Flight Details to Sell or Create Your Own NFT Ticket
          </h2>

          <div className="flex items-center mt-8 justify-center">
            <p className="text-lg text-gray-900 dark:text-gray-100 mr-4">Existing NFT Ticket?</p>
            <div
              onClick={() => {
                setExistingTicket(!existingTicket)
                checkFormCompletion(!existingTicket, confirmationCode, airline, ticketPurchaseId)
              }
              }
              className={`flex h-5.5 w-12 cursor-pointer rounded-full border border-black ${
                existingTicket ? "justify-start bg-white" : "justify-end bg-black"
              } p-[1px] ml-2`}
            >
              <motion.div
                className={`h-5 w-5 rounded-full ${existingTicket ? "bg-black" : "bg-white"}`}
                layout
                transition={{ type: "spring", stiffness: 700, damping: 30 }}
              />
            </div>
          </div>
        </div>
        {isConnected ? (
          <div className="mt-8 max-w-lg mx-auto">
            <input
              type="text"
              className="w-full px-4 py-2 border rounded-md mt-4 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:border-neutral-800 dark:focus:ring-neutral-800"
              placeholder="Flight Confirmation Code"
              value={confirmationCode}
              onChange={handleConfirmationCodeChange}
            />
            {existingTicket && (
            <><div className="relative mt-4">
                <select
                  className="w-full appearance-none px-4 py-2 border rounded-md mt-1 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:border-neutral-800 dark:focus:ring-neutral-800"
                  value={airline}
                  onChange={handleAirlineChange}
                >
                  <option value="Select">Select Airline...</option>
                  <option value="American Airlines">American Airlines</option>
                  <option value="Delta">Delta</option>
                  <option value="Southwest">Southwest</option>
                  <option value="United">United</option>
                  <option value="JetBlue">JetBlue</option>
                </select>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-gray-400 dark:text-gray-600 absolute top-1/2 right-3 transform -translate-y-1/2 pointer-events-none"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 12a2 2 0 100-4 2 2 0 000 4z"
                    clipRule="evenodd" />
                  <path
                    fillRule="evenodd"
                    d="M4.293 9.293a1 1 0 011.414-1.414L10 12.586l4.293-4.293a1 1 0 111.414 1.414l-5 5a1 1 0 01-1.414 0l-5-5z"
                    clipRule="evenodd" />
                </svg>
              </div>
              <input
                type="text"
                className="w-full px-4 py-2 border rounded-md mt-4 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:border-neutral-800 dark:focus:ring-neutral-800"
                placeholder="Last 4 Digits of Card"
                value={ticketPurchaseId}
                onChange={handleTicketPurchaseIdChange} />
                <button
                  className={`w-full mt-4 px-4 py-2 bg-black text-white rounded-md ${viewFlightDisabled ? "opacity-50 cursor-not-allowed" : "hover:bg-white hover:text-black hover:border-black border transition-all"}`}
                  disabled={viewFlightDisabled}
                  onClick={handleViewFlightClick}
                >
                  Create Ticket
                </button>
                
                </>
            )}
            {!existingTicket && (
              <button
                  className={`w-full mt-4 px-4 py-2 bg-black text-white rounded-md ${viewFlightDisabled ? "opacity-50 cursor-not-allowed" : "hover:bg-white hover:text-black hover:border-black border transition-all"}`}
                  disabled={viewFlightDisabled}
                  onClick={handleViewFlightClick}
                >
                Sell/Transfer Ticket
            </button>
            )}
          </div>
        ) : (
          <div className="mt-5 text-center">
            <p className="text-md text-gray-600 dark:text-gray-300 mt-2">
              Please connect your wallet before continuing
            </p>
          </div>
        )}
      </div>

      {showPopup && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50">
          <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 shadow-lg border dark:border-neutral-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Something went wrong...
            </h3>
            <p className="text-gray-700 dark:text-gray-300 mt-2">
              The flight your entered may be invalid or does not exist.
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

      {ownerPopup && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50">
          <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 shadow-lg border dark:border-neutral-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Flight Detail Viewing Denied...
            </h3>
            <p className="text-gray-700 dark:text-gray-300 mt-2">
              You are not the owner of this ticket.
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

      {warning && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50">
          <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 shadow-lg border dark:border-neutral-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Warning...
            </h3>
            <p className="text-gray-700 dark:text-gray-300 mt-2">
              This ticket already has been created as a NFT ticket. You will be redirected to transfer page.
            </p>
            <button
              onClick={() => {showWarning(false) 
                router.push("/transferTicket");}}
              className="mt-4 px-4 py-2 bg-black text-white rounded hover:bg-white hover:text-black hover:border-black border transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {saleProgress && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50">
          <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 shadow-lg border dark:border-neutral-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Sale in Progress
            </h3>
            <p className="text-gray-700 dark:text-gray-300 mt-2">
              You cannot sell or transfer a ticket while it's waiting for a buyer
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
    </main>
  );
}
