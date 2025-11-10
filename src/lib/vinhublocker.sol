// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract TokenLocker is Ownable, Pausable {
    struct Lock {
        uint256 id;
        address token;
        address beneficiary;
        uint256 amount;
        uint256 startTime;
        uint256 cliffDuration;
        uint256 vestingDuration;
        uint256 released;
        bool revoked;
    }

    uint256 public lockCount;
    mapping(uint256 => Lock) public locks;
    mapping(address => uint256[]) public userLocks;
    mapping(address => uint256) public totalLocked;
    mapping(address => uint256) public tokenPricesUSD; // USD price per token (18 decimals)

    event LockCreated(
        uint256 indexed id,
        address indexed beneficiary,
        address token,
        uint256 amount,
        uint256 startTime,
        uint256 cliffDuration,
        uint256 vestingDuration
    );
    event TokensReleased(uint256 indexed id, address indexed beneficiary, address token, uint256 amount);
    event LockTransferred(uint256 indexed id, address indexed oldBeneficiary, address indexed newBeneficiary);

    constructor() {
        lockCount = 0;
    }

    function createLock(
        address _token,
        uint256 _amount,
        uint256 _startTime,
        uint256 _cliffDuration,
        uint256 _vestingDuration,
        address _beneficiary
    ) external whenNotPaused returns (uint256) {
        require(_token != address(0), "Invalid token address");
        require(_amount > 0, "Amount must be greater than 0");
        require(_beneficiary != address(0), "Invalid beneficiary");
        require(_startTime >= block.timestamp, "Start time must be in the future");
        if (_vestingDuration > 0) {
            require(_cliffDuration <= _vestingDuration, "Cliff exceeds vesting duration");
        }

        IERC20 token = IERC20(_token);
        require(token.transferFrom(msg.sender, address(this), _amount), "Token transfer failed");

        lockCount++;
        uint256 lockId = lockCount;
        locks[lockId] = Lock({
            id: lockId,
            token: _token,
            beneficiary: _beneficiary,
            amount: _amount,
            startTime: _startTime,
            cliffDuration: _cliffDuration,
            vestingDuration: _vestingDuration,
            released: 0,
            revoked: false
        });
        userLocks[_beneficiary].push(lockId);
        totalLocked[_token] += _amount;

        emit LockCreated(lockId, _beneficiary, _token, _amount, _startTime, _cliffDuration, _vestingDuration);
        return lockId;
    }

    function release(uint256 _id) external whenNotPaused {
        Lock storage lock = locks[_id];
        require(lock.beneficiary == msg.sender, "Not the beneficiary");
        require(!lock.revoked, "Lock is revoked");
        uint256 releasable = releasableAmount(_id);
        require(releasable > 0, "No tokens releasable");

        lock.released += releasable;
        totalLocked[lock.token] -= releasable;
        IERC20(lock.token).transfer(lock.beneficiary, releasable);
        emit TokensReleased(_id, lock.beneficiary, lock.token, releasable);
    }

    function transferLock(uint256 _id, address _newBeneficiary) external whenNotPaused {
        require(_newBeneficiary != address(0), "Invalid new beneficiary");
        Lock storage lock = locks[_id];
        require(lock.beneficiary == msg.sender, "Not the beneficiary");
        require(!lock.revoked, "Lock is revoked");
        require(lock.released < lock.amount, "Lock fully released");

        userLocks[lock.beneficiary] = removeLockId(userLocks[lock.beneficiary], _id);
        userLocks[_newBeneficiary].push(_id);
        address oldBeneficiary = lock.beneficiary;
        lock.beneficiary = _newBeneficiary;
        emit LockTransferred(_id, oldBeneficiary, _newBeneficiary);
    }

    function batchRelease(uint256[] calldata _ids) external whenNotPaused {
        for (uint256 i = 0; i < _ids.length; i++) {
            Lock storage lock = locks[_ids[i]];
            if (lock.beneficiary == msg.sender && !lock.revoked && releasableAmount(_ids[i]) > 0) {
                uint256 releasable = releasableAmount(_ids[i]);
                lock.released += releasable;
                totalLocked[lock.token] -= releasable;
                IERC20(lock.token).transfer(lock.beneficiary, releasable);
                emit TokensReleased(_ids[i], lock.beneficiary, lock.token, releasable);
            }
        }
    }

    function batchTransfer(uint256[] calldata _ids, address _newBeneficiary) external whenNotPaused {
        require(_newBeneficiary != address(0), "Invalid new beneficiary");
        for (uint256 i = 0; i < _ids.length; i++) {
            Lock storage lock = locks[_ids[i]];
            if (lock.beneficiary == msg.sender && !lock.revoked && lock.released < lock.amount) {
                userLocks[lock.beneficiary] = removeLockId(userLocks[lock.beneficiary], _ids[i]);
                userLocks[_newBeneficiary].push(_ids[i]);
                address oldBeneficiary = lock.beneficiary;
                lock.beneficiary = _newBeneficiary;
                emit LockTransferred(_ids[i], oldBeneficiary, _newBeneficiary);
            }
        }
    }

    function setTokenPrice(address _token, uint256 _price) external onlyOwner {
        tokenPricesUSD[_token] = _price;
    }

    function releasableAmount(uint256 _id) public view returns (uint256) {
        Lock memory lock = locks[_id];
        if (lock.revoked || lock.released >= lock.amount) return 0;

        uint256 currentTime = block.timestamp;
        if (currentTime < lock.startTime + lock.cliffDuration) return 0;

        if (lock.vestingDuration == 0) {
            return lock.amount - lock.released;
        }

        uint256 elapsed = currentTime - lock.startTime;
        uint256 vested = (lock.amount * elapsed) / lock.vestingDuration;
        if (vested > lock.amount) vested = lock.amount;
        return vested - lock.released;
    }

    function getLocksForUser(address _user) external view returns (Lock[] memory) {
        uint256[] memory lockIds = userLocks[_user];
        Lock[] memory userLocks = new Lock[](lockIds.length);
        for (uint256 i = 0; i < lockIds.length; i++) {
            userLocks[i] = locks[lockIds[i]];
        }
        return userLocks;
    }

    function uniqueTokens() external view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 1; i <= lockCount; i++) {
            if (totalLocked[locks[i].token] > 0) count++;
        }
        return count;
    }

    function activeLocks() external view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 1; i <= lockCount; i++) {
            if (!locks[i].revoked && locks[i].released < locks[i].amount) count++;
        }
        return count;
    }

    function totalValueUSD() external view returns (uint256) {
        uint256 total = 0;
        for (uint256 i = 1; i <= lockCount; i++) {
            if (!locks[i].revoked && locks[i].released < locks[i].amount) {
                uint256 remaining = locks[i].amount - locks[i].released;
                total += (remaining * tokenPricesUSD[locks[i].token]) / 1e18;
            }
        }
        return total;
    }

    function removeLockId(uint256[] memory _ids, uint256 _lockId) private pure returns (uint256[] memory) {
        uint256[] memory newIds = new uint256[](_ids.length - 1);
        uint256 index = 0;
        for (uint256 i = 0; i < _ids.length; i++) {
            if (_ids[i] != _lockId) {
                newIds[index] = _ids[i];
                index++;
            }
        }
        return newIds;
    }
}
